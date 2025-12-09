# local-joto

**⚠️ WORK IN PROGRESS ⚠️**

This is a notebook of work to get the Joto Whiteboard to work without the cloud. It is not a finalized solution and may contain bugs or incomplete features. Use at your own risk.

## Purpose & Goal

The goal is to provide a CLI, script, or API to process an SVG and send it to the Joto over the local network, bypassing the need for cloud services.

**WARNING:** There currently doesn't seem to be any safeguard in Joto to prevent sending G-code that moves the pen beyond the drawable area. **This could damage the hardware.** I have not tested this beyond the `extents.svg` included in the repo.

## Getting Started

The recommended way to run this application is using Docker.

### Prerequisites

- [Docker](https://www.docker.com/get-started) installed on your machine.
- A Joto device connected to your local network.

### Running with Docker

1.  **Build the Docker image:**

    ```bash
    docker build -t local-joto .
    ```

2.  **Run the container:**

    ```bash
    docker run -p 3000:3000 local-joto
    ```

    The API will now be available at `http://localhost:3000`.

### Joto Network Configuration

To communicate with your Joto, you need its IP address.

1.  Ensure your Joto is connected to the same Wi-Fi network as your computer.
2.  Find the Joto's IP address. You can often find this in your router's admin interface (look for a device named `joto` or similar) or by using a network scanning tool.
3.  Verify connectivity by visiting `http://<JOTO_IP>` in your browser. You should see the Joto's status page.

## Usage

Please refer to the [API Documentation](docs/API.md) for detailed instructions on how to use the `/convert` and `/jot` endpoints.

### Quick Test

We have provided shell scripts to help you test the API quickly.

1.  **Convert an SVG:**
    ```bash
    ./test_convert.sh
    ```
    This will convert `extents.svg` and save the result to `output.g`.

2.  **Send to Joto:**
    Edit `test_jot.sh` or set the environment variable `JOTO_IP` to your Joto's IP address:
    ```bash
    export JOTO_IP=192.168.1.100
    ./test_jot.sh
    ```
    This will send `output.g` to your Joto.

## Development

The project is built with [Deno](https://deno.land/).

### Project Structure

- `app/`: Contains the main application code.
  - `main.ts`: Entry point.
  - `handlers.ts`: API route handlers.
  - `jotoCommands.ts`: GCode command templates.
- `docs/`: Documentation.
- `research/`: Contains notes and research materials found during development.

### Running Tests

To run the automated tests:

```bash
deno test --allow-all app/
```

## History

### 2025-01-15
Added Dockerfile that hosts an api app that can convert an svg and send gcode to a joto on the local network.
