import { config } from 'dotenv';

// Los secretos locales no se guardan en el .env que este repositorio ya versiona.
// Las variables del proceso (por ejemplo, las del hosting) conservan prioridad.
config({ path: '.env.local', quiet: true });
config({ path: '.env', quiet: true });
