import * as childProcess from "child_process";
import AsyncProcess from "./Process";


export default class AsyncNodeProcess extends AsyncProcess {
	public constructor(private module: string, private args: string[], private options?: childProcess.SpawnOptions) {
		super();
	}

	protected processSpawner(): childProcess.ChildProcess {
		return childProcess.fork(this.module, this.args, this.options);
	}
	
}