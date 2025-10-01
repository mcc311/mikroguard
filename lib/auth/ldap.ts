import ldap, { SearchOptions, Client } from 'ldapjs';
import { User } from '@/types';

interface LDAPConfig {
  url: string;
  bindDN: string;
  bindPassword: string;
  searchBase: string;
  adminGroup: string;
}

function getLDAPConfig(): LDAPConfig {
  return {
    url: process.env.LDAP_URL || 'ldap://localhost:389',
    bindDN: process.env.LDAP_BIND_DN || '',
    bindPassword: process.env.LDAP_BIND_PASSWORD || '',
    searchBase: process.env.LDAP_SEARCH_BASE || '',
    adminGroup: process.env.LDAP_ADMIN_GROUP || '',
  };
}

/**
 * Authenticate user via LDAP
 */
export async function authenticateUser(username: string, password: string): Promise<User | null> {
  const config = getLDAPConfig();

  return new Promise((resolve, reject) => {
    const client: Client = ldap.createClient({
      url: config.url,
    });

    // First, bind with admin credentials to search for user
    client.bind(config.bindDN, config.bindPassword, (bindErr) => {
      if (bindErr) {
        client.unbind();
        return reject(new Error('LDAP bind failed: ' + bindErr.message));
      }

      const searchOptions: SearchOptions = {
        filter: `(uid=${username})`,
        scope: 'sub',
        attributes: ['dn', 'uid', 'cn', 'mail', 'memberOf'],
      };

      client.search(config.searchBase, searchOptions, (searchErr, searchRes) => {
        if (searchErr) {
          client.unbind();
          return reject(new Error('LDAP search failed: ' + searchErr.message));
        }

        let userDN: string | null = null;
        let userAttributes: any = {};

        searchRes.on('searchEntry', (entry) => {
          userDN = entry.objectName ? String(entry.objectName) : null;
          userAttributes = {
            uid: (entry as any).attributes.find((a: any) => a.type === 'uid')?.values[0],
            cn: (entry as any).attributes.find((a: any) => a.type === 'cn')?.values[0],
            mail: (entry as any).attributes.find((a: any) => a.type === 'mail')?.values[0],
            memberOf: (entry as any).attributes.find((a: any) => a.type === 'memberOf')?.values,
          };
        });

        searchRes.on('error', (err) => {
          client.unbind();
          reject(new Error('LDAP search error: ' + err.message));
        });

        searchRes.on('end', () => {
          if (!userDN) {
            client.unbind();
            return resolve(null);
          }

          // Now bind with user credentials to verify password
          const userClient: Client = ldap.createClient({
            url: config.url,
          });

          userClient.bind(userDN, password, (userBindErr) => {
            userClient.unbind();
            client.unbind();

            if (userBindErr) {
              return resolve(null);
            }

            // Check if user is admin
            const isAdmin = checkIfAdmin(userAttributes.memberOf, config.adminGroup);

            const user: User = {
              username: Array.isArray(userAttributes.uid) ? userAttributes.uid[0] : userAttributes.uid,
              displayName: Array.isArray(userAttributes.cn) ? userAttributes.cn[0] : userAttributes.cn,
              email: Array.isArray(userAttributes.mail) ? userAttributes.mail[0] : userAttributes.mail,
              isAdmin,
            };

            resolve(user);
          });
        });
      });
    });

    client.on('error', (err) => {
      client.unbind();
      reject(new Error('LDAP connection error: ' + err.message));
    });
  });
}

/**
 * Check if user is in admin group
 */
function checkIfAdmin(memberOf: string | string[] | undefined, adminGroup: string): boolean {
  if (!memberOf || !adminGroup) {
    return false;
  }

  const groups = Array.isArray(memberOf) ? memberOf : [memberOf];
  return groups.some((group) => group.toLowerCase() === adminGroup.toLowerCase());
}

/**
 * Validate LDAP connection
 */
export async function validateLDAPConnection(): Promise<boolean> {
  const config = getLDAPConfig();

  return new Promise((resolve) => {
    const client: Client = ldap.createClient({
      url: config.url,
    });

    client.bind(config.bindDN, config.bindPassword, (err) => {
      if (err) {
        client.unbind();
        resolve(false);
      } else {
        client.unbind();
        resolve(true);
      }
    });

    client.on('error', () => {
      client.unbind();
      resolve(false);
    });
  });
}
