# local-joto
Notebook of my work to get the Joto Whiteboard to work without the cloud.

The goal is a cli, node script, etc. way to process an svg and send it to the Joto over the local network.

Contributions/Discussion welcome.

## 2025-01-15
Added Dockerfile that hosts an api app that can convert an svg and send gcode to a joto on the local network.

I have not tested this beyond the extents.svg included in the repo. FYI there doesn't seem to be any safeguard in joto to prevent sending gcode that moves the pen beyond the drawable area, which could damage the hardware.