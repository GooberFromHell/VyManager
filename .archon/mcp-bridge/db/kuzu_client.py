"""
Kuzu Graph Database Client — Embedded graph for task DAGs, dependencies, and artifact indexing.
All task relationships are graph edges, not JSON arrays. Queries return subgraphs in <5ms.
"""

import json
import logging
from pathlib import Path
from typing import Any, Optional

import kuzu

logger = logging.getLogger("archon.kuzu")


class KuzuClient:
    def __init__(self, db_path: str):
        self.db_path = db_path
        Path(db_path).mkdir(parents=True, exist_ok=True)
        self.db = kuzu.Database(db_path)
        self.conn = kuzu.Connection(self.db)

    def initialize_schema(self):
        """Create node and relationship tables if they don't exist."""
        schema_statements = [
            # Node tables
            """CREATE NODE TABLE IF NOT EXISTS Project (
                id STRING, name STRING, status STRING, created_at STRING,
                PRIMARY KEY(id)
            )""",
            """CREATE NODE TABLE IF NOT EXISTS Task (
                id STRING, objective STRING, status STRING,
                agent_role STRING, team_type STRING,
                token_budget_in INT64, token_budget_out INT64,
                priority INT64, created_at STRING, completed_at STRING,
                PRIMARY KEY(id)
            )""",
            """CREATE NODE TABLE IF NOT EXISTS Artifact (
                id STRING, task_id STRING, artifact_type STRING,
                path STRING, summary STRING, created_at STRING,
                PRIMARY KEY(id)
            )""",
            """CREATE NODE TABLE IF NOT EXISTS Script (
                id STRING, operation STRING, input_shape STRING,
                path STRING, hash STRING, hit_count INT64,
                PRIMARY KEY(id)
            )""",
            # Relationship tables
            "CREATE REL TABLE IF NOT EXISTS BELONGS_TO (FROM Task TO Project)",
            "CREATE REL TABLE IF NOT EXISTS DEPENDS_ON (FROM Task TO Task, weight DOUBLE DEFAULT 1.0)",
            "CREATE REL TABLE IF NOT EXISTS PRODUCES (FROM Task TO Artifact)",
            "CREATE REL TABLE IF NOT EXISTS CONSUMES (FROM Task TO Artifact)",
            "CREATE REL TABLE IF NOT EXISTS CACHED_BY (FROM Task TO Script, operation STRING)",
        ]

        for stmt in schema_statements:
            try:
                self.conn.execute(stmt)
            except Exception as e:
                # Table already exists or other non-fatal schema issue
                if "already exists" not in str(e).lower():
                    logger.warning(f"Schema statement warning: {e}")

        logger.info("Kuzu schema initialized.")

    def execute(self, query: str, params: dict = None) -> list[dict]:
        """Execute a Cypher query and return results as list of dicts."""
        try:
            if params:
                result = self.conn.execute(query, params)
            else:
                result = self.conn.execute(query)

            rows = []
            while result.has_next():
                row = result.get_next()
                col_names = result.get_column_names()
                rows.append(dict(zip(col_names, row)))
            return rows
        except Exception as e:
            logger.error(f"Kuzu query error: {e}\nQuery: {query}")
            return []

    def query_single(self, query: str, params: dict = None) -> Optional[dict]:
        """Execute query and return first result or None."""
        results = self.execute(query, params)
        return results[0] if results else None

    # ── Task Operations ──────────────────────────────────────────

    def create_task(self, task_id: str, objective: str, agent_role: str,
                    project_id: str = "default", token_budget_in: int = 50000,
                    token_budget_out: int = 16000, priority: int = 0,
                    dependencies: list[str] = None) -> dict:
        """Create a task node and its dependency edges."""
        from datetime import datetime
        now = datetime.utcnow().isoformat() + "Z"

        # Ensure project exists
        self.execute(
            "MERGE (p:Project {id: $id}) SET p.name = $name, p.status = 'active'",
            {"id": project_id, "name": project_id}
        )

        # Create task
        self.execute("""
            CREATE (t:Task {
                id: $id, objective: $obj, status: 'queued',
                agent_role: $role, team_type: 'pipeline',
                token_budget_in: $tbi, token_budget_out: $tbo,
                priority: $pri, created_at: $now, completed_at: ''
            })
        """, {
            "id": task_id, "obj": objective, "role": agent_role,
            "tbi": token_budget_in, "tbo": token_budget_out,
            "pri": priority, "now": now,
        })

        # Link to project
        self.execute("""
            MATCH (t:Task {id: $tid}), (p:Project {id: $pid})
            CREATE (t)-[:BELONGS_TO]->(p)
        """, {"tid": task_id, "pid": project_id})

        # Create dependency edges
        if dependencies:
            for dep_id in dependencies:
                self.execute("""
                    MATCH (t:Task {id: $tid}), (dep:Task {id: $did})
                    CREATE (t)-[:DEPENDS_ON]->(dep)
                """, {"tid": task_id, "did": dep_id})

        return {"task_id": task_id, "status": "queued", "dependencies": dependencies or []}

    def get_task(self, task_id: str) -> Optional[dict]:
        """Get a single task by ID."""
        return self.query_single("MATCH (t:Task {id: $id}) RETURN t.*", {"id": task_id})

    def update_task_status(self, task_id: str, status: str) -> bool:
        """Update task status. If 'complete', set completed_at timestamp."""
        from datetime import datetime
        now = datetime.utcnow().isoformat() + "Z"

        if status == "complete":
            self.execute(
                "MATCH (t:Task {id: $id}) SET t.status = $s, t.completed_at = $now",
                {"id": task_id, "s": status, "now": now}
            )
        else:
            self.execute(
                "MATCH (t:Task {id: $id}) SET t.status = $s",
                {"id": task_id, "s": status}
            )
        return True

    # ── DAG Queries ──────────────────────────────────────────────

    def get_task_dependencies(self, task_id: str) -> list[dict]:
        """Get all upstream dependencies for a task with their artifact summaries."""
        return self.execute("""
            MATCH (t:Task {id: $id})-[:DEPENDS_ON]->(dep:Task)
            OPTIONAL MATCH (dep)-[:PRODUCES]->(a:Artifact)
            RETURN dep.id AS task_id, dep.status AS status,
                   dep.objective AS objective, a.summary AS artifact_summary,
                   a.path AS artifact_path
        """, {"id": task_id})

    def get_ready_tasks(self, project_id: str = "default") -> list[dict]:
        """Find tasks that are queued and have all dependencies complete."""
        return self.execute("""
            MATCH (t:Task {status: 'queued'})-[:BELONGS_TO]->(p:Project {id: $pid})
            WHERE NOT EXISTS {
                MATCH (t)-[:DEPENDS_ON]->(dep:Task)
                WHERE dep.status <> 'complete'
            }
            RETURN t.id AS task_id, t.objective AS objective,
                   t.agent_role AS agent_role, t.priority AS priority,
                   t.token_budget_in AS token_budget_in,
                   t.token_budget_out AS token_budget_out
            ORDER BY t.priority DESC
        """, {"pid": project_id})

    def get_dag_layers(self, project_id: str = "default") -> list[list[dict]]:
        """Topologically sort tasks into parallelizable layers.
        Each layer contains tasks that can run simultaneously."""
        # Get all tasks and their dependencies
        tasks = self.execute("""
            MATCH (t:Task)-[:BELONGS_TO]->(p:Project {id: $pid})
            OPTIONAL MATCH (t)-[:DEPENDS_ON]->(dep:Task)
            RETURN t.id AS task_id, t.status AS status,
                   t.agent_role AS role, t.objective AS objective,
                   collect(dep.id) AS depends_on
        """, {"pid": project_id})

        if not tasks:
            return []

        # Build adjacency for topological sort
        task_map = {}
        for t in tasks:
            tid = t["task_id"]
            deps = t["depends_on"] if t["depends_on"] != [None] else []
            task_map[tid] = {"deps": set(deps), "data": t}

        # Kahn's algorithm for layer-by-layer topological sort
        layers = []
        remaining = dict(task_map)

        while remaining:
            # Find all tasks with no unresolved dependencies
            layer = []
            for tid, info in remaining.items():
                unresolved = info["deps"] & set(remaining.keys())
                if not unresolved:
                    layer.append(info["data"])

            if not layer:
                # Cycle detected — break with remaining as final layer
                layer = [info["data"] for info in remaining.values()]
                layers.append(layer)
                break

            layers.append(layer)
            for t in layer:
                del remaining[t["task_id"]]

        return layers

    def get_downstream_tasks(self, task_id: str) -> list[dict]:
        """Find tasks that depend on the given task."""
        return self.execute("""
            MATCH (downstream:Task)-[:DEPENDS_ON]->(t:Task {id: $id})
            RETURN downstream.id AS task_id, downstream.status AS status,
                   downstream.agent_role AS role
        """, {"id": task_id})

    # ── Artifact Operations ──────────────────────────────────────

    def store_artifact(self, task_id: str, artifact_id: str,
                       artifact_type: str, path: str, summary: str) -> dict:
        """Store artifact metadata and link to producing task."""
        from datetime import datetime
        now = datetime.utcnow().isoformat() + "Z"

        self.execute("""
            CREATE (a:Artifact {
                id: $aid, task_id: $tid, artifact_type: $type,
                path: $path, summary: $summary, created_at: $now
            })
        """, {"aid": artifact_id, "tid": task_id, "type": artifact_type,
              "path": path, "summary": summary, "now": now})

        self.execute("""
            MATCH (t:Task {id: $tid}), (a:Artifact {id: $aid})
            CREATE (t)-[:PRODUCES]->(a)
        """, {"tid": task_id, "aid": artifact_id})

        return {"artifact_id": artifact_id, "path": path}

    def get_task_artifacts(self, task_id: str) -> list[dict]:
        """Get all artifacts produced by a task."""
        return self.execute("""
            MATCH (t:Task {id: $id})-[:PRODUCES]->(a:Artifact)
            RETURN a.id AS id, a.artifact_type AS type,
                   a.path AS path, a.summary AS summary
        """, {"id": task_id})

    # ── Script Cache Operations ──────────────────────────────────

    def register_script(self, script_id: str, operation: str,
                        input_shape: str, path: str, script_hash: str) -> dict:
        """Register a cached script in the graph."""
        self.execute("""
            MERGE (s:Script {id: $id})
            SET s.operation = $op, s.input_shape = $shape,
                s.path = $path, s.hash = $hash, s.hit_count = 0
        """, {"id": script_id, "op": operation, "shape": input_shape,
              "path": path, "hash": script_hash})
        return {"script_id": script_id, "operation": operation}

    def find_cached_script(self, operation: str, input_shape: str) -> Optional[dict]:
        """Find a cached script matching an operation and input shape."""
        result = self.query_single("""
            MATCH (s:Script {operation: $op, input_shape: $shape})
            RETURN s.id AS id, s.path AS path, s.hash AS hash, s.hit_count AS hits
        """, {"op": operation, "shape": input_shape})

        if result:
            # Increment hit counter
            self.execute(
                "MATCH (s:Script {id: $id}) SET s.hit_count = s.hit_count + 1",
                {"id": result["id"]}
            )

        return result

    # ── Full DAG Status ──────────────────────────────────────────

    def get_project_state(self, project_id: str = "default") -> dict:
        """Comprehensive project state for orchestrator decision-making."""
        tasks = self.execute("""
            MATCH (t:Task)-[:BELONGS_TO]->(p:Project {id: $pid})
            OPTIONAL MATCH (t)-[:DEPENDS_ON]->(dep:Task)
            RETURN t.id AS task_id, t.status AS status,
                   t.agent_role AS role, t.objective AS objective,
                   t.priority AS priority,
                   collect(dep.id) AS depends_on
            ORDER BY t.priority DESC
        """, {"pid": project_id})

        counts = {"total": 0, "complete": 0, "in_progress": 0, "queued": 0, "blocked": 0, "failed": 0}
        for t in tasks:
            counts["total"] += 1
            s = t.get("status", "unknown")
            if s in counts:
                counts[s] += 1

        ready = self.get_ready_tasks(project_id)
        layers = self.get_dag_layers(project_id)

        return {
            "project_id": project_id,
            "summary": counts,
            "tasks": tasks,
            "ready_tasks": ready,
            "dag_layers": [[t["task_id"] for t in layer] for layer in layers],
            "total_layers": len(layers),
        }
