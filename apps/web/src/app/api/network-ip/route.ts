import { NextResponse } from 'next/server';
import os from 'os';

export async function GET() {
  const interfaces = os.networkInterfaces();
  const ips: string[] = [];

  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address);
      }
    }
  }

  // Pick the preferred Wi-Fi / LAN IP (usually starts with 192.168. or 10. or 172.)
  const preferredIp =
    ips.find((ip) => ip.startsWith('192.168.')) ||
    ips.find((ip) => ip.startsWith('10.')) ||
    ips.find((ip) => ip.startsWith('172.')) ||
    ips[0] ||
    'localhost';

  return NextResponse.json({
    primaryIp: preferredIp,
    allIps: ips,
    port: 3000,
  });
}
