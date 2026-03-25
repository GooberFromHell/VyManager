#!/bin/bash

# --- Colors for formatting ---
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}          VyOS OFFLINE MIGRATION HEALTH CHECK       ${NC}"
echo -e "${BLUE}====================================================${NC}"

# 1. Interface Check
echo -e "\n${YELLOW}[1] Network Interfaces (Link Status)${NC}"
printf "%-15s %-20s %-10s\n" "Interface" "IP Address" "Status"
echo "----------------------------------------------------"
/sbin/ip -o -4 addr show | awk '{print $2, $4}' | while read -r iface ip; do
    state=$(cat /sys/class/net/"${iface%%:*}"/operstate 2>/dev/null)
    if [ "$state" == "up" ]; then
        printf "%-15s %-20s [${GREEN}UP${NC}]\n" "$iface" "$ip"
    else
        printf "%-15s %-20s [${RED}DOWN${NC}]\n" "$iface" "$ip"
    fi
done

# 2. Container Check
echo -e "\n${YELLOW}[2] Container Subsystem (Podman)${NC}"
if command -v podman &> /dev/null; then
    RUNNING_CONTAINERS=$(podman ps --format "{{.Names}} ({{.Status}})")
    if [ -n "$RUNNING_CONTAINERS" ]; then
        echo -e "${GREEN}Running Containers:${NC}"
        echo "$RUNNING_CONTAINERS" | sed 's/^/  - /'
    else
        echo -e "${RED}No containers currently running.${NC}"
    fi
else
    echo -e "${RED}Podman not found on this system.${NC}"
fi

# 3. System Identity Check
echo -e "\n${YELLOW}[3] System Identity (SSH Fingerprint)${NC}"
if [ -f /etc/ssh/ssh_host_ed25519_key.pub ]; then
    FINGERPRINT=$(ssh-keygen -l -f /etc/ssh/ssh_host_ed25519_key.pub | awk '{print $2}')
    echo -e "ED25519 Fingerprint: ${GREEN}$FINGERPRINT${NC}"
else
    echo -e "${RED}SSH Host keys missing or not found.${NC}"
fi

# 4. API Service Check
echo -e "\n${YELLOW}[4] Management Services (HTTPS API)${NC}"
API_PORT=$(grep -A 5 "http-api" /config/config.boot | grep "port" | awk '{print $2}' | tr -d ';')
if [ -n "$API_PORT" ]; then
    if netstat -tulpn | grep -q ":$API_PORT"; then
        echo -e "HTTPS API: ${GREEN}LISTENING${NC} on port $API_PORT"
    else
        echo -e "HTTPS API: ${RED}NOT RUNNING${NC} (Check config commit status)"
    fi
else
    echo -e "HTTPS API: ${YELLOW}NOT CONFIGURED${NC} in config.boot"
fi

echo -e "\n${BLUE}====================================================${NC}"
echo -e "${BLUE}                Verification Complete               ${NC}"
echo -e "${BLUE}====================================================${NC}"