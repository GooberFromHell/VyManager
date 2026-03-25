"""
LanceDB Vector Store Client — Embedded vector search for semantic artifact retrieval.
Embeddings generated via Ollama HTTP API (if available) or skipped gracefully.
No PyTorch, no sentence-transformers — just an HTTP call.
"""

import json
import logging
import os
from pathlib import Path
from typing import Optional

import httpx

logger = logging.getLogger("archon.lance")

EMBED_DIM = 768  # nomic-embed-text dimension
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://host.docker.internal:11434")
EMBED_MODEL = os.environ.get("EMBED_MODEL", "nomic-embed-text")


class LanceClient:
    def __init__(self, db_path: str):
        self.db_path = db_path
        Path(db_path).mkdir(parents=True, exist_ok=True)
        self.db = None
        self._ollama_available: Optional[bool] = None

    def initialize(self):
        """Initialize LanceDB connection."""
        import lancedb
        self.db = lancedb.connect(self.db_path)

        if "artifacts" not in self.db.table_names():
            import pyarrow as pa
            schema = pa.schema([
                ("id", pa.string()),
                ("task_id", pa.string()),
                ("summary", pa.string()),
                ("path", pa.string()),
                ("artifact_type", pa.string()),
                ("vector", pa.list_(pa.float32(), EMBED_DIM)),
            ])
            self.db.create_table("artifacts", schema=schema)

        logger.info("LanceDB initialized.")

    def _check_ollama(self) -> bool:
        """Check if Ollama is reachable. Cached after first check."""
        if self._ollama_available is not None:
            return self._ollama_available

        try:
            resp = httpx.get(f"{OLLAMA_URL}/api/tags", timeout=3)
            self._ollama_available = resp.status_code == 200
            if self._ollama_available:
                logger.info(f"Ollama available at {OLLAMA_URL}")
            else:
                logger.warning(f"Ollama returned {resp.status_code}")
        except Exception:
            self._ollama_available = False
            logger.warning(f"Ollama not reachable at {OLLAMA_URL}. Embeddings disabled.")

        return self._ollama_available

    def _hash_embed(self, text: str) -> list[float]:
        """Lightweight deterministic embedding via character-level hashing.
        Not as good as neural embeddings, but provides meaningful similarity
        for keyword overlap. Used as fallback when Ollama is unavailable."""
        import hashlib
        import struct

        # Normalize text
        text = text.lower().strip()
        words = text.split()

        # Initialize vector
        vector = [0.0] * EMBED_DIM

        if not words:
            return vector

        # For each word, hash it to deterministic positions and values
        for word in words:
            h = hashlib.sha256(word.encode()).digest()
            # Use hash bytes to set positions in the vector
            for i in range(0, min(len(h), 32), 4):
                pos = struct.unpack('>I', h[i:i+4])[0] % EMBED_DIM
                val = struct.unpack('>f', h[i:i+4])[0]
                # Normalize to [-1, 1] range
                val = max(-1.0, min(1.0, val / 1e38)) if abs(val) > 1e-38 else 0.01
                vector[pos] += val

        # L2 normalize
        norm = sum(v * v for v in vector) ** 0.5
        if norm > 0:
            vector = [v / norm for v in vector]

        return vector

    def embed_text(self, text: str) -> list[float]:
        """Generate embedding via Ollama HTTP API. Falls back to hash-based embedding if unavailable."""
        if not self._check_ollama():
            return self._hash_embed(text)

        try:
            resp = httpx.post(
                f"{OLLAMA_URL}/api/embed",
                json={"model": EMBED_MODEL, "input": text},
                timeout=30,
            )
            resp.raise_for_status()
            data = resp.json()
            # Ollama returns {"embeddings": [[...]]} for /api/embed
            embeddings = data.get("embeddings", [])
            if embeddings and len(embeddings) > 0:
                return embeddings[0]
            # Fallback for older Ollama versions using /api/embeddings
            embedding = data.get("embedding", [])
            if embedding:
                return embedding
            return self._hash_embed(text)
        except Exception as e:
            logger.warning(f"Embedding failed: {e}")
            return self._hash_embed(text)

    def store_artifact(self, artifact_id: str, task_id: str,
                       summary: str, path: str, artifact_type: str = "output"):
        """Store artifact with embedding for semantic search."""
        vector = self.embed_text(summary)

        table = self.db.open_table("artifacts")
        table.add([{
            "id": artifact_id,
            "task_id": task_id,
            "summary": summary,
            "path": path,
            "artifact_type": artifact_type,
            "vector": vector,
        }])

        has_embedding = any(v != 0.0 for v in vector)
        logger.info(f"Stored artifact {artifact_id} (embedded: {has_embedding})")

    def search_similar(self, query: str, limit: int = 5) -> list[dict]:
        """Semantic search over artifact summaries. Uses Ollama embeddings when available, hash-based fallback otherwise."""
        query_vector = self.embed_text(query)
        if all(v == 0.0 for v in query_vector):
            return []

        table = self.db.open_table("artifacts")

        try:
            results = (
                table.search(query_vector)
                .limit(limit)
                .to_list()
            )
            return [
                {
                    "id": r["id"],
                    "task_id": r["task_id"],
                    "summary": r["summary"],
                    "path": r["path"],
                    "score": r.get("_distance", 0),
                }
                for r in results
            ]
        except Exception as e:
            logger.error(f"LanceDB search error: {e}")
            return []

    def get_artifact(self, artifact_id: str) -> Optional[dict]:
        """Retrieve a specific artifact by ID."""
        table = self.db.open_table("artifacts")
        try:
            safe_id = artifact_id.replace("'", "''")
            results = table.search().where(f"id = '{safe_id}'").limit(1).to_list()
            return results[0] if results else None
        except Exception:
            return None
