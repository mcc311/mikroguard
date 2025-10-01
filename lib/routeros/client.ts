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
 * RouterOS REST API Client
 * Implements communication via RouterOS REST API
 * Based on: https://help.mikrotik.com/docs/display/ROS/REST+API
 */
export class RouterOSClient {
  private options: RouterOSOptions;
  private baseUrl: string;
  private authHeader: string;

  constructor(options: RouterOSOptions) {
    this.options = {
      useTls: false,
      ...options,
    };
    const protocol = this.options.useTls ? 'https' : 'http';
    this.baseUrl = `${protocol}://${this.options.host}:${this.options.port}`;
    this.authHeader = 'Basic ' + Buffer.from(`${this.options.username}:${this.options.password}`).toString('base64');
  }

  /**
   * Connect to RouterOS device (not needed for REST API)
   */
  async connect(): Promise<void> {
    // REST API doesn't require persistent connection
    // Just verify credentials work
    try {
      await this.get('/system/resource');
    } catch (error) {
      throw new Error('Failed to connect to RouterOS: ' + (error as Error).message);
    }
  }

  /**
   * Disconnect from RouterOS (not needed for REST API)
   */
  disconnect(): void {
    // No persistent connection to close
  }

  /**
   * Make a GET request
   */
  async get(path: string): Promise<any[]> {
    const url = `${this.baseUrl}/rest${path}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': this.authHeader,
      },
    });

    if (!response.ok) {
      throw new Error(`RouterOS API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Make a PUT request (add new item)
   */
  async put(path: string, data: Record<string, any>): Promise<any> {
    const url = `${this.baseUrl}/rest${path}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`RouterOS API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Make a POST request (for commands)
   */
  async post(path: string, data?: Record<string, any>): Promise<any> {
    const url = `${this.baseUrl}/rest${path}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`RouterOS API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Make a PATCH request
   */
  async patch(path: string, data: Record<string, any>): Promise<any> {
    const url = `${this.baseUrl}/rest${path}`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`RouterOS API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Make a DELETE request
   */
  async delete(path: string): Promise<void> {
    const url = `${this.baseUrl}/rest${path}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': this.authHeader,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`RouterOS API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
  }

  /**
   * Send a command to RouterOS (legacy compatibility)
   */
  async sendCommand(words: string[]): Promise<RouterOSResponse> {
    // This method is kept for compatibility but REST API works differently
    throw new Error('sendCommand is not supported with REST API. Use get/post/patch/delete methods instead.');
  }
}

// Singleton instance
let client: RouterOSClient | null = null;

export async function getRouterOSClient(): Promise<RouterOSClient> {
  if (!client) {
    client = new RouterOSClient({
      host: process.env.ROUTEROS_HOST!,
      port: parseInt(process.env.ROUTEROS_PORT || '8080'),
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
