import app from './app.js';
import { port, production } from './config.js';
app.listen(port,()=>console.log(`\n✔ ProSijil API: http://localhost:${port}\n${production?'✔ Production mode':'✔ Development mode'}\n`));
