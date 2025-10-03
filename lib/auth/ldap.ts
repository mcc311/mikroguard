import { Client } from 'ldapts';
import { User } from '@/types';
import { getConfig, type LDAPConfig } from '@/lib/config';

function getLDAPConfig(): LDAPConfig {
  return getConfig().ldap;
}

/**
 * Authenticate user via LDAP using ldapts
 */
export async function authenticateUser(username: string, password: string): Promise<User | null> {
  const config = getLDAPConfig();
  const client = new Client({
    url: config.url,
    timeout: 5000,
    connectTimeout: 5000,
  });

  try {
    // First, bind with admin credentials to search for user
    await client.bind(config.bindDN, config.bindPassword);

    // Search for the user
    const { searchEntries } = await client.search(config.searchBase, {
      filter: `(uid=${username})`,
      scope: 'sub',
      attributes: ['dn', 'uid', 'cn', 'mail', 'memberOf'],
    });

    if (searchEntries.length === 0) {
      await client.unbind();
      return null;
    }

    const entry = searchEntries[0];
    const userDN = entry.dn;

    // Extract user attributes
    const uid = Array.isArray(entry.uid) ? entry.uid[0] : entry.uid;
    const cn = Array.isArray(entry.cn) ? entry.cn[0] : entry.cn;
    const mail = Array.isArray(entry.mail) ? entry.mail[0] : entry.mail;
    const memberOf = entry.memberOf;

    // Unbind admin connection
    await client.unbind();

    // Now verify password by binding with user credentials
    const userClient = new Client({
      url: config.url,
      timeout: 5000,
      connectTimeout: 5000,
    });

    try {
      await userClient.bind(userDN, password);
      await userClient.unbind();
    } catch {
      // Invalid password
      return null;
    }

    // Check if user is admin
    // Convert memberOf to string/string[] if it's a Buffer
    let memberOfString: string | string[] | undefined;
    if (memberOf) {
      if (Buffer.isBuffer(memberOf)) {
        memberOfString = memberOf.toString('utf-8');
      } else if (Array.isArray(memberOf)) {
        memberOfString = memberOf.map(m => Buffer.isBuffer(m) ? m.toString('utf-8') : String(m));
      } else {
        memberOfString = String(memberOf);
      }
    }
    const isAdmin = checkIfAdmin(memberOfString, config.adminGroup);

    const user: User = {
      username: String(uid || ''),
      displayName: String(cn || ''),
      email: String(mail || ''),
      isAdmin,
    };

    return user;
  } catch (error) {
    try {
      await client.unbind();
    } catch {
      // Ignore unbind errors
    }
    throw new Error('LDAP authentication failed: ' + (error as Error).message);
  }
}

/**
 * Check if user is in admin group
 */
function checkIfAdmin(memberOf: string | string[] | undefined, adminGroup: string | undefined): boolean {
  if (!memberOf || !adminGroup) {
    return false;
  }

  const groups = Array.isArray(memberOf) ? memberOf : [memberOf];
  const adminGroupLower = adminGroup.toLowerCase();
  return groups.some((group) => group && typeof group === 'string' && group.toLowerCase() === adminGroupLower);
}

/**
 * Validate LDAP connection
 */
export async function validateLDAPConnection(): Promise<boolean> {
  const config = getLDAPConfig();
  const client = new Client({
    url: config.url,
    timeout: 5000,
    connectTimeout: 5000,
  });

  try {
    await client.bind(config.bindDN, config.bindPassword);
    await client.unbind();
    return true;
  } catch {
    try {
      await client.unbind();
    } catch {
      // Ignore unbind errors
    }
    return false;
  }
}
