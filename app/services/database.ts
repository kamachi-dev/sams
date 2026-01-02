import { Pool } from "pg";
import fs from "fs";
import path from "path";

const caCert = fs.readFileSync(path.join(process.cwd(), "certs", "prod-ca-2021.crt"), "utf-8");

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL?.split("?")[0], // Remove trailing slash if present
    ssl: {
        ca: caCert,
        rejectUnauthorized: false // Set to true if you want to enforce SSL certificate validation
    },
});

pool.on("error", (err) => {
    console.error(err);
});

export default pool; 