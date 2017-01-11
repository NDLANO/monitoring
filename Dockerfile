FROM grafana/grafana:4.0.2

COPY ndla-run-grafana.sh /ndla-run-grafana.sh
RUN chmod +x /ndla-run-grafana.sh

RUN echo \
   'deb ftp://ftp.us.debian.org/debian/ jessie main\n \
    deb ftp://ftp.us.debian.org/debian/ jessie-updates main\n \
    deb http://security.debian.org jessie/updates main\n' \
    > /etc/apt/sources.list

RUN apt-get update && \
    apt-get --yes clean && \
    apt-get --yes install python-pip jq && \
    pip install awscli

COPY scripts/* /usr/share/grafana/public/dashboards/

# needed to run grafana on port 80
RUN setcap 'cap_net_bind_service=+ep' /usr/sbin/grafana-server
ENTRYPOINT ["/ndla-run-grafana.sh"]
