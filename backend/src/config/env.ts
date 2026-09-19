import { config } from 'dotenv';

// Los secretos locales no se guardan en el .env que este repositorio ya versiona.
// Las variables del proceso (por ejemplo, las del hosting) conservan prioridad.
config({ path: new URL('../../.env.local', import.meta.url), quiet: true });
config({ path: new URL('../../.env', import.meta.url), quiet: true });
