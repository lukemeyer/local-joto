FROM denoland/deno:alpine-2.1.5

ENV LD_LIBRARY_PATH /usr/lib:/usr/local/lib

# The port that your application listens to.
EXPOSE 3000

WORKDIR /app

# Prefer not to run as root.
#USER deno

RUN apk update && apk add git && apk add curl


# Install svg2gcode
RUN wget "https://github.com/sameer/svg2gcode/releases/download/cli-v0.0.17/svg2gcode_cli-v0.0.17_x86_64-unknown-linux-musl.zip" \
  && unzip svg2gcode_cli-v0.0.17_x86_64-unknown-linux-musl.zip -d svg2gcode \
  && rm -f svg2gcode_cli-v0.0.17_x86_64-unknown-linux-musl.zip

RUN chmod +x svg2gcode/svg2gcode

# Cache the dependencies as a layer (the following two steps are re-run only when deps.ts is modified).
# Ideally cache deps.ts will download and compile _all_ external files used in main.ts.
#COPY deps.ts .
RUN deno install --entrypoint deps.ts

# These steps will be re-run upon each file change in your working directory:
COPY . .
# Compile the main app so that it doesn't need to be compiled each startup/entry.
RUN deno cache main.ts

CMD ["run", "--allow-net", "--allow-read", "main.ts"]