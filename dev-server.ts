import { installExpressSecurityGuards } from './server-security';

installExpressSecurityGuards();
await import('./server');
