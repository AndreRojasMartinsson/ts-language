export interface IOptions {
  [option: string]: any;
}

export interface IEnv {
  VERBOSITY: string;
  OPT_LEVEL: string;
  SC_SKIP_CACHE: string;
}

export interface IFile {
  name: string;
  path: string;
}
