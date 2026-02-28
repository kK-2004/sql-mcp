import fs from "node:fs/promises";
import net from "node:net";
import { Client as SshClient } from "ssh2";

export function buildPoolConfig(config, tunnel) {
  if (config.mysqlUrl) {
    const url = new URL(config.mysqlUrl);
    if (tunnel) {
      url.hostname = tunnel.localHost;
      url.port = String(tunnel.localPort);
    }
    return {
      uri: url.toString(),
      connectionLimit: 10
    };
  }

  return {
    host: tunnel ? tunnel.localHost : config.host,
    port: tunnel ? tunnel.localPort : config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    connectionLimit: 10
  };
}

async function resolveSshPrivateKey(sshConfig) {
  if (sshConfig.privateKeyPath) {
    return fs.readFile(sshConfig.privateKeyPath, "utf8");
  }
  return sshConfig.privateKey;
}

export async function createSshTunnel(sshConfig) {
  const sshClient = new SshClient();
  let tunnelServer = null;
  try {
    const privateKey = await resolveSshPrivateKey(sshConfig);

    const connectOptions = {
      host: sshConfig.host,
      port: sshConfig.port,
      username: sshConfig.user,
      password: sshConfig.password,
      privateKey,
      passphrase: sshConfig.passphrase
    };

    await new Promise((resolve, reject) => {
      sshClient.once("ready", resolve);
      sshClient.once("error", reject);
      sshClient.connect(connectOptions);
    });

    tunnelServer = net.createServer((localSocket) => {
      sshClient.forwardOut(
        localSocket.remoteAddress || "127.0.0.1",
        localSocket.remotePort || 0,
        sshConfig.dstHost,
        sshConfig.dstPort,
        (error, upstreamStream) => {
          if (error) {
            localSocket.destroy(error);
            return;
          }
          localSocket.pipe(upstreamStream).pipe(localSocket);
        }
      );
    });

    await new Promise((resolve, reject) => {
      tunnelServer.once("error", reject);
      tunnelServer.listen(sshConfig.localPort, sshConfig.localHost, resolve);
    });

    const address = tunnelServer.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to resolve SSH local tunnel address");
    }

    return {
      sshClient,
      tunnelServer,
      localHost: sshConfig.localHost,
      localPort: address.port
    };
  } catch (error) {
    if (tunnelServer?.listening) {
      tunnelServer.close();
    }
    sshClient.end();
    throw error;
  }
}

export async function closeSshTunnel(tunnel) {
  if (!tunnel) return;
  await new Promise((resolve) => {
    if (tunnel.tunnelServer?.listening) {
      tunnel.tunnelServer.close(() => resolve());
      return;
    }
    resolve();
  });
  if (tunnel.sshClient) {
    tunnel.sshClient.end();
  }
}
