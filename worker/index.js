import { Container, getContainer } from "@cloudflare/containers";

// The app needs Node (sockets, DNS, worker threads), which a Worker doesn't have, so it runs as a
// plain Next.js server in a container and this Worker only forwards requests to it.
export class OpenRead extends Container {
  defaultPort = 8080;
  sleepAfter = "30m";
}

const worker = {
  fetch(request, env) {
    return getContainer(env.OPENREAD).fetch(request);
  },
};

export default worker;
