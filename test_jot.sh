#!/bin/sh

# Define the API endpoint
API_ENDPOINT="http://localhost:3000/jot"

# Path to the GCode file
GCODE_FILE_PATH="output.g"

# Base URL for the file system
BASE_URL="http://10.12.18.248"

# Make the API request using curl and save the output to 'jot_output.txt'
curl -X POST "$API_ENDPOINT" \
     -F "file=@$GCODE_FILE_PATH" \
     -F "baseUrl=$BASE_URL" 