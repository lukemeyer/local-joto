#!/bin/sh

# Define the API endpoint
API_URL="${API_URL:-http://localhost:3000}"
API_ENDPOINT="$API_URL/jot"

# Path to the GCode file
GCODE_FILE_PATH="output.g"

# Base URL for the file system
# Default to 10.12.18.248 if not set
JOTO_IP="${JOTO_IP:-10.12.18.248}"
BASE_URL="http://$JOTO_IP"

# Make the API request using curl and save the output to 'jot_output.txt'
curl -X POST "$API_ENDPOINT" \
     -F "file=@$GCODE_FILE_PATH" \
     -F "baseUrl=$BASE_URL"
