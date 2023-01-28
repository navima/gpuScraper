import React, { useState, useEffect } from "react";
import "./styles.css";
import initSqlJs, { Database } from "sql.js";
import GpuTable from "./components/table/GpuTable";
import SQLRepl from "./sqlRepl/SqlRepl";

// Required to let webpack 4 know it needs to copy the wasm file to our assets
import sqlWasm from "!!file-loader?name=sql-wasm-[contenthash].wasm!sql.js/dist/sql-wasm.wasm";

export default function App() {
	const [db, setDb] = useState(null);
	const [error, setError] = useState(null);

	useEffect(async () => {
		// sql.js needs to fetch its wasm file, so we cannot immediately instantiate the database
		// without any configuration, initSqlJs will fetch the wasm files directly from the same path as the js
		// see ../craco.config.js
		try {
			const response = await fetch("https://raw.githubusercontent.com/navima/gpuScraper/archive/archive.db", {
				withCredentials: false,
				crossorigin: true,
				mode: 'cors'
			});
			const buf = await response.arrayBuffer();
			const SQL = await initSqlJs({ locateFile: () => sqlWasm });
			setDb(new SQL.Database(new Uint8Array(buf)));
		} catch (err) {
			setError(err);
		}
	}, []);

	if (error) return <pre>{error.toString()}</pre>;
	else if (!db) return <pre>Loading...</pre>;
	else return <div>
		<GpuTable db={db} />
		<SQLRepl db={db} />
	</div>
}