import React, { useState, useEffect } from "react";
import "./styles.css";
import initSqlJs from "sql.js";
import GpuTable from "./components/table/GpuTable";
import SQLRepl from "./sqlRepl/SqlRepl";

// Required to let webpack 4 know it needs to copy the wasm file to our assets
// eslint-disable-next-line import/no-webpack-loader-syntax
import sqlWasm from "!!file-loader?name=sql-wasm-[contenthash].wasm!sql.js/dist/sql-wasm.wasm";

const mb = 1024 * 1024;

export default function App() {
	const [db, setDb] = useState(null);
	const [error, setError] = useState(null);
	const [downloaded, setDownloaded] = useState(null);
	const [toDowload, setToDowload] = useState(null);
	function asciiProgressBar() {
		const progress = downloaded / toDowload;
		const width = 30;
		const complete = Math.round(width * progress);
		const incomplete = width - complete;
		return `[${"=".repeat(complete)}${" ".repeat(incomplete)}]${Math.round(progress * 100).toString().padStart(3, ' ')}%`;
	}

	useEffect(() => {
		const f = async () => {
			console.log("fetching db size");
			const headResponse = await fetch("https://raw.githubusercontent.com/navima/gpuScraper/archive/archive.db", {
				method: 'HEAD',
				withCredentials: false,
				crossorigin: true,
				mode: 'cors'
			});
			const size = headResponse.headers.get("content-length")
			console.log("db size", size);
			setToDowload(size);
			setDownloaded(0);
		}
		f()
	}, []);

	useEffect(() => {
		const f = async () => {
			if (!toDowload) return;
			// sql.js needs to fetch its wasm file, so we cannot immediately instantiate the database
			// without any configuration, initSqlJs will fetch the wasm files directly from the same path as the js
			// see ../craco.config.js
			try {
				console.log("fetching db");
				const response = await fetch("https://raw.githubusercontent.com/navima/gpuScraper/archive/archive.db", {
					withCredentials: false,
					crossorigin: true,
					mode: 'cors',
					cache: 'force-cache'
				});
				console.log("streaming db");
				const reader = response.body.getReader();
				const chunks = [];
				let downloaded = 0;
				while (true) {
					const { value, done } = await reader.read();
					chunks.push(value);
					if (done) break;
					downloaded += value.length;
					if (chunks.length % 10 === 0) {
						setDownloaded(downloaded);
					}
				}
				console.log("done streaming db");
				const buf = await new Blob(chunks).arrayBuffer();
				const SQL = await initSqlJs({ locateFile: () => sqlWasm });
				setDb(new SQL.Database(new Uint8Array(buf)));
			} catch (err) {
				setError(err);
			}
		}
		f()
	}, [toDowload]);

	if (db) {
		return <div>
			<GpuTable db={db} />
			<SQLRepl db={db} />
			<footer>Performance data sourced from HardwareUnboxed 1440p, High, RTX-on, DLSS-off results, normalized.</footer>
		</div>;
	}
	if (error)
		return <pre className="middle-message">{downloaded}</pre>;
	else
		return <pre className="middle-message">
			<div>Downloading database...</div>
			<div>{asciiProgressBar()}</div>
			<div>{(downloaded / mb).toFixed()}/{(toDowload / mb).toFixed()} MB</div>
		</pre>;
}