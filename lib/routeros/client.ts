import { Socket } from 'net';
import { TLSSocket, connect as tlsConnect } from 'tls';
import crypto from 'crypto';

interface RouterOSOptions {
  host: string;
  port: number;
  username: string;
  password: string;
  useTls?: boolean;
}

interface RouterOSResponse {
  done?: boolean;
  data?: Record<string, string>[];
  error?: string;
  trap?: string;
}

/**
 * RouterOS API Client
 * Implements the RouterOS API protocol for communication
 * Based on: https://help.mikrotik.com/docs/display/ROS/API
 */
export class RouterOSClient {
  private options: RouterOSOptions;
  private socket: Socket | TLSSocket | null = null;
  private buffer: Buffer = Buffer.alloc(0);
  private responseCallbacks: Map<number, (response: RouterOSResponse) => void> = new Map();
  private commandId = 0;

  constructor(options: RouterOSOptions) {
    this.options = {
      useTls: false,
      ...options,
    };
  }

  /**
   * Connect to RouterOS device
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const { host, port, useTls } = this.options;

      if (useTls) {
        this.socket = tlsConnect({ host, port, rejectUnauthorized: false }, () => {
          this.login().then(resolve).catch(reject);
        });
      } else {
        this.socket = new Socket();
        this.socket.connect(port, host, () => {
          this.login().then(resolve).catch(reject);
        });
      }

      this.socket.on('data', (data: Buffer) => {
        this.handleData(data);
      });

      this.socket.on('error', (err) => {
        reject(err);
      });

      this.socket.on('close', () => {
        this.socket = null;
      });
    });
  }

  /**
   * Login to RouterOS
   */
  private async login(): Promise<void> {
    const { username, password } = this.options;

    // Send login command
    const loginResponse = await this.sendCommand(['/login', `=name=${username}`, `=password=${password}`]);

    if (loginResponse.trap || loginResponse.error) {
      throw new Error(loginResponse.trap || loginResponse.error || 'Login failed');
    }
  }

  /**
   * Disconnect from RouterOS
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
  }

  /**
   * Send a command to RouterOS
   */
  async sendCommand(words: string[]): Promise<RouterOSResponse> {
    if (!this.socket) {
      throw new Error('Not connected to RouterOS');
    }

    const id = this.commandId++;
    const commandData = this.encodeCommand(words, id);

    return new Promise((resolve, reject) => {
      this.responseCallbacks.set(id, (response) => {
        this.responseCallbacks.delete(id);
        if (response.trap || response.error) {
          reject(new Error(response.trap || response.error));
        } else {
          resolve(response);
        }
      });

      this.socket!.write(commandData, (err) => {
        if (err) {
          this.responseCallbacks.delete(id);
          reject(err);
        }
      });
    });
  }

  /**
   * Encode command according to RouterOS API protocol
   */
  private encodeCommand(words: string[], tag?: number): Buffer {
    const buffers: Buffer[] = [];

    for (const word of words) {
      const wordBuffer = Buffer.from(word, 'utf8');
      buffers.push(this.encodeLength(wordBuffer.length));
      buffers.push(wordBuffer);
    }

    if (tag !== undefined) {
      const tagWord = `.tag=${tag}`;
      const tagBuffer = Buffer.from(tagWord, 'utf8');
      buffers.push(this.encodeLength(tagBuffer.length));
      buffers.push(tagBuffer);
    }

    // End of command
    buffers.push(Buffer.from([0]));

    return Buffer.concat(buffers);
  }

  /**
   * Encode length according to RouterOS API protocol
   */
  private encodeLength(length: number): Buffer {
    if (length < 0x80) {
      return Buffer.from([length]);
    } else if (length < 0x4000) {
      return Buffer.from([((length >> 8) | 0x80), length & 0xff]);
    } else if (length < 0x200000) {
      return Buffer.from([
        ((length >> 16) | 0xc0),
        (length >> 8) & 0xff,
        length & 0xff,
      ]);
    } else if (length < 0x10000000) {
      return Buffer.from([
        ((length >> 24) | 0xe0),
        (length >> 16) & 0xff,
        (length >> 8) & 0xff,
        length & 0xff,
      ]);
    } else {
      return Buffer.from([
        0xf0,
        (length >> 24) & 0xff,
        (length >> 16) & 0xff,
        (length >> 8) & 0xff,
        length & 0xff,
      ]);
    }
  }

  /**
   * Handle incoming data from RouterOS
   */
  private handleData(data: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, data]);

    while (this.buffer.length > 0) {
      const result = this.parseResponse();
      if (!result) break;

      const { response, tag } = result;

      if (tag !== undefined && this.responseCallbacks.has(tag)) {
        const callback = this.responseCallbacks.get(tag)!;
        callback(response);
      }
    }
  }

  /**
   * Parse response from buffer
   */
  private parseResponse(): { response: RouterOSResponse; tag?: number } | null {
    const words: string[] = [];
    let tag: number | undefined;

    while (true) {
      const { length, bytesRead } = this.decodeLength();
      if (length === null) return null; // Need more data

      if (length === 0) {
        // End of sentence
        this.buffer = this.buffer.subarray(bytesRead);
        break;
      }

      if (this.buffer.length < bytesRead + length) {
        return null; // Need more data
      }

      const word = this.buffer.subarray(bytesRead, bytesRead + length).toString('utf8');
      words.push(word);

      if (word.startsWith('.tag=')) {
        tag = parseInt(word.substring(5), 10);
      }

      this.buffer = this.buffer.subarray(bytesRead + length);
    }

    return { response: this.parseWords(words), tag };
  }

  /**
   * Decode length from buffer
   */
  private decodeLength(): { length: number | null; bytesRead: number } {
    if (this.buffer.length === 0) return { length: null, bytesRead: 0 };

    const firstByte = this.buffer[0];

    if (firstByte === 0) {
      return { length: 0, bytesRead: 1 };
    } else if ((firstByte & 0x80) === 0) {
      return { length: firstByte, bytesRead: 1 };
    } else if ((firstByte & 0xc0) === 0x80) {
      if (this.buffer.length < 2) return { length: null, bytesRead: 0 };
      const length = ((firstByte & 0x3f) << 8) | this.buffer[1];
      return { length, bytesRead: 2 };
    } else if ((firstByte & 0xe0) === 0xc0) {
      if (this.buffer.length < 3) return { length: null, bytesRead: 0 };
      const length = ((firstByte & 0x1f) << 16) | (this.buffer[1] << 8) | this.buffer[2];
      return { length, bytesRead: 3 };
    } else if ((firstByte & 0xf0) === 0xe0) {
      if (this.buffer.length < 4) return { length: null, bytesRead: 0 };
      const length = ((firstByte & 0x0f) << 24) | (this.buffer[1] << 16) | (this.buffer[2] << 8) | this.buffer[3];
      return { length, bytesRead: 4 };
    } else if (firstByte === 0xf0) {
      if (this.buffer.length < 5) return { length: null, bytesRead: 0 };
      const length = (this.buffer[1] << 24) | (this.buffer[2] << 16) | (this.buffer[3] << 8) | this.buffer[4];
      return { length, bytesRead: 5 };
    }

    return { length: null, bytesRead: 0 };
  }

  /**
   * Parse words into structured response
   */
  private parseWords(words: string[]): RouterOSResponse {
    const response: RouterOSResponse = {
      data: [],
    };

    let currentItem: Record<string, string> = {};

    for (const word of words) {
      if (word === '!done') {
        response.done = true;
      } else if (word === '!trap') {
        response.trap = 'Command failed';
      } else if (word === '!re') {
        if (Object.keys(currentItem).length > 0) {
          response.data!.push(currentItem);
          currentItem = {};
        }
      } else if (word.startsWith('=')) {
        const [key, ...valueParts] = word.substring(1).split('=');
        currentItem[key] = valueParts.join('=');
      } else if (word.startsWith('!trap=')) {
        response.trap = word.substring(6);
      } else if (word.startsWith('!error=')) {
        response.error = word.substring(7);
      }
    }

    if (Object.keys(currentItem).length > 0) {
      response.data!.push(currentItem);
    }

    return response;
  }
}

// Singleton instance
let client: RouterOSClient | null = null;

export async function getRouterOSClient(): Promise<RouterOSClient> {
  if (!client) {
    client = new RouterOSClient({
      host: process.env.ROUTEROS_HOST!,
      port: parseInt(process.env.ROUTEROS_PORT || '8728'),
      username: process.env.ROUTEROS_USERNAME!,
      password: process.env.ROUTEROS_PASSWORD!,
      useTls: process.env.ROUTEROS_USE_TLS === 'true',
    });
    await client.connect();
  }
  return client;
}

export function disconnectRouterOS(): void {
  if (client) {
    client.disconnect();
    client = null;
  }
}
