container {
    name grafana {
        allow-host-networks
        image "docker.io/grafana/grafana:latest"
    }
    name node-exporter {
        allow-host-networks
        description "Prometheus Node Exporter"
        image "quay.io/prometheus/node-exporter:latest"
        port node-exporter {
            destination "9100"
            protocol "tcp"
            source "9100"
        }
        volume hostroot {
            destination "/host"
            source "/"
        }
    }
    name promethus-server {
        allow-host-networks
        allow-host-pid
        arguments "--config.file=/config/prometheus.yml --storage.tsdb.path=/storage"
        capability "net-admin"
        capability "net-bind-service"
        capability "net-raw"
        capability "setpcap"
        capability "sys-admin"
        gid "0"
        image "docker.io/prom/prometheus:latest"
        restart "on-failure"
        sysctl {
        }
        uid "0"
        volume config {
            destination "/config"
            source "/config/containers/prometheus/config"
        }
        volume data {
            destination "/storage"
            source "/config/containers/prometheus/storage"
        }
    }
    name vymanager-backend {
        arguments "uvicorn app:app --host 0.0.0.0 --port 8000 --proxy-headers --env-file /config/backend.env"
        environment BETTER_AUTH_SECRET {
            value "Change-This-To-Something-Secret"
        }
        environment DATABASE_URL {
            value "postgresql://vymanager:vymanager@vymanager-postgres:5432/vymanager_auth"
        }
        environment FRONTEND_URL {
            value "http://vymanager-frontend:3000"
        }
        environment SSH_ENCRYPTION_KEY {
            value "42a33e90f3f87b35687a6f2a0475e35f22703b74ad60adba788029ae8430509d"
        }
        environment TRUSTED_ORIGINS {
            value "http://172.16.100.2:3001,http://localhost:3001"
        }
        environment VYMANAGER_ENV {
            value "production"
        }
        image "ghcr.io/community-vyprojects/vymanager-backend:beta"
        network vymgr-net {
        }
        port 8000 {
            destination "8000"
            source "8000"
        }
        restart "on-failure"
        volume vymanager-config {
            destination "/config/backend.env"
            mode "ro"
            source "/config/vymanager/.env"
        }
    }
    name vymanager-frontend {
        image "ghcr.io/community-vyprojects/vymanager-frontend:beta"
        network vymgr-net {
        }
        port 3000 {
            destination "3001"
            source "3001"
        }
        restart "on-failure"
        volume vymanager-config {
            destination "/app/.env"
            mode "ro"
            source "/config/vymanager/.env"
        }
    }
    name vymanager-postgres {
        environment POSTGRES_DB {
            value "vymanager_auth"
        }
        environment POSTGRES_PASSWORD {
            value "vymanager"
        }
        environment POSTGRES_USER {
            value "vymanager"
        }
        image "docker.io/postgres:16-alpine"
        network vymgr-net {
        }
        port 5432 {
            destination "5432"
            source "5432"
        }
        restart "on-failure"
        volume postgres_data {
            destination "/var/lib/postgresql/data"
            source "/config/vymanager/postgres_data"
        }
    }
    network vymgr-net {
        prefix "172.18.200.0/24"
    }
    registry ghcr.io {
    }
    registry quay.io {
    }
}
firewall {
    ipv4 {
        input {
            filter {
                rule 10 {
                    action "drop"
                    destination {
                        address "0.0.0.0/0"
                    }
                    protocol "all"
                    source {
                        address "10.11.0.0/16"
                    }
                }
            }
        }
    }
}
interfaces {
    ethernet eth0 {
        address "dhcp"
        hw-id "00:0c:29:49:6e:e2"
        offload {
            gro
            gso
            sg
            tso
        }
    }
    ethernet eth1 {
        address "dhcp"
        hw-id "00:0c:29:49:6e:ec"
        offload {
            gro
            gso
            sg
            tso
        }
    }
    ethernet eth2 {
        address "dhcp"
        hw-id "00:0c:29:c1:3e:b6"
    }
    loopback lo {
    }
}
nat {
    source {
        rule 100 {
            destination {
                address "0.0.0.0/0"
            }
            outbound-interface {
                name "eth0"
            }
            source {
                address "10.100.10.2"
            }
            translation {
                address "masquerade"
            }
        }
    }
}
protocols {
    ospf {
        default-information {
            originate {
            }
        }
        interface eth0 {
        }
        redistribute {
            connected {
            }
            static {
            }
        }
    }
    static {
        route 0.0.0.0/0 {
            next-hop 10.10.10.1 {
            }
        }
        route 192.168.30.0/24 {
            next-hop 10.100.0.1 {
                interface "eth0"
            }
        }
    }
}
service {
    https {
        api {
            graphql {
                authentication {
                    type "key"
                }
            }
            keys {
                id vymanager {
                    key "SuperSecret"
                }
            }
            rest {
            }
        }
    }
    monitoring {
        prometheus {
            blackbox-exporter {
                listen-address "127.0.0.1"
                modules {
                    dns {
                        name dns_ipv4 {
                            preferred-ip-protocol "ipv4"
                            query-name "dns-ipv4"
                            query-type "A"
                            timeout "3"
                        }
                        name dns_ipv6 {
                            preferred-ip-protocol "ipv6"
                            query-name "dns-ipv6"
                            query-type "AAAA"
                            timeout "3"
                        }
                    }
                    icmp {
                        name icmp_ipv4 {
                            ip-protocol-fallback
                            preferred-ip-protocol "ipv4"
                            timeout "5"
                        }
                    }
                }
            }
            node-exporter {
                collectors {
                    textfile
                }
                listen-address "10.10.10.130"
                port "9100"
            }
        }
        telegraf {
            prometheus-client {
                listen-address "127.0.0.1"
            }
        }
    }
    ntp {
        allow-client {
            address "127.0.0.0/8"
            address "169.254.0.0/16"
            address "10.0.0.0/8"
            address "172.16.0.0/12"
            address "192.168.0.0/16"
            address "::1/128"
            address "fe80::/10"
            address "fc00::/7"
        }
        server time1.vyos.net {
        }
        server time2.vyos.net {
        }
        server time3.vyos.net {
        }
    }
    ssh {
        access-control {
            allow {
                user "vyos"
                user "root"
            }
        }
        listen-address "10.10.10.130"
        listen-address "192.168.214.130"
        listen-address "192.168.214.131"
        listen-address "192.168.37.241"
        listen-address "0.0.0.0"
        listen-address "172.16.100.2"
    }
}
system {
    config-management {
        commit-revisions "100"
    }
    conntrack {
        flow-accounting
        log {
            event {
                new {
                }
                update {
                }
            }
        }
        modules {
            ftp
            h323
            nfs
            pptp
            sip
            sqlnet
            tftp
        }
    }
    console {
        device ttyS0 {
            speed "115200"
        }
    }
    flow-accounting {
        interface "eth1"
        interface "eth0"
        interface "eth2"
        interface "eth3"
        interface "vxlan0"
        interface "vxlan1"
        netflow {
            engine-id "1"
            max-flows "999999"
            sampling-rate "1000"
            server 127.0.0.1 {
                port "2055"
            }
            version "10"
        }
    }
    host-name "vyos"
    login {
        user vyos {
            authentication {
                encrypted-password "$6$QxPS.uk6mfo$9QBSo8u1FkH16gMyAVhus6fU3LOzvLR9Z9.82m3tiHFAxTtIkhaZSWssSgzt4v4dGAL8rhVQxTg0oAG9/q11h/"
                plaintext-password ""
            }
        }
    }
    name-server "1.1.1.1"
    name-server "8.8.8.8"
    sysctl {
        parameter net.netfilter.nf_conntrack_acct {
            value "1"
        }
        parameter net.netfilter.nf_conntrack_timestamp {
            value "1"
        }
    }
    syslog {
        global {
            facility all {
                level "info"
            }
            facility local7 {
                level "debug"
            }
        }
        local {
            facility all {
                level "info"
            }
            facility local7 {
                level "debug"
            }
        }
    }
    task-scheduler {
        task flows-metrics {
            executable {
                path "/config/scripts/vyos-contrack_textfile.sh"
            }
            interval "1"
        }
    }
    time-zone "America/Chicago"
    update-check {
        url "https://vyos.net/get/nightly-builds/"
    }
}


// Warning: Do not remove the following line.
// vyos-config-version: "bgp@6:broadcast-relay@1:cluster@2:config-management@1:conntrack@6:conntrack-sync@2:container@3:dhcp-relay@2:dhcp-server@11:dhcpv6-server@6:dns-dynamic@4:dns-forwarding@4:firewall@19:flow-accounting@2:https@7:ids@2:interfaces@33:ipoe-server@4:ipsec@13:isis@3:l2tp@9:lldp@3:mdns@1:monitoring@2:nat@8:nat66@3:nhrp@1:ntp@3:openconnect@3:openvpn@4:ospf@2:pim@1:policy@9:pppoe-server@11:pptp@5:qos@3:quagga@12:reverse-proxy@3:rip@1:rpki@2:salt@1:snmp@3:ssh@2:sstp@6:system@29:vpp@1:vrf@3:vrrp@4:vyos-accel-ppp@2:wanloadbalance@4:webproxy@2"
// Release version: 2025.06.24-0020-rolling
