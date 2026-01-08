#!/bin/sh

# Define the API endpoint
API_URL="${API_URL:-http://localhost:3000}"
API_ENDPOINT="$API_URL/convert"

# Path to the SVG file
SVG_FILE_PATH="extents.svg"

# Make the API request using curl and save the output to 'output.g'
curl -X POST "$API_ENDPOINT" \
     -F "file=@$SVG_FILE_PATH" \
     -o output.g
