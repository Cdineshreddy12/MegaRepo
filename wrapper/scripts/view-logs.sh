#!/bin/bash

# Script to view logs from Elasticsearch/Kibana

echo "📊 Log Viewer Options"
echo "===================="
echo ""
echo "1. Open Kibana in browser:"
echo "   http://localhost:5601"
echo ""
echo "2. View recent logs (last 20):"
curl -s "http://localhost:9200/app-logs-*/_search?pretty&sort=@timestamp:desc&size=20" | jq '.hits.hits[] | {timestamp: ._source["@timestamp"], level: ._source.level, message: ._source.message, service: ._source.service}'
echo ""
echo "3. View today's logs:"
TODAY=$(date +%Y.%m.%d)
curl -s "http://localhost:9200/app-logs-${TODAY}/_search?pretty&sort=@timestamp:desc" | jq '.hits.hits[] | {timestamp: ._source["@timestamp"], level: ._source.level, message: ._source.message}'
echo ""
echo "4. Count total logs:"
curl -s "http://localhost:9200/app-logs-*/_count?pretty"
echo ""
echo "5. List all indices:"
curl -s "http://localhost:9200/_cat/indices/app-logs-*?v&s=index"
echo ""

