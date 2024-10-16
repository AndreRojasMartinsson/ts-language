import { log } from "console";

export class FormatVisitor {
  private indentLevel: number;
  private output: string;

  constructor() {
    this.indentLevel = 0;
    this.output = "";
  }

  indent() {
    return "  ".repeat(this.indentLevel);
  }

  visit(node: any) {
    if (node == null) return;

    log(node.constructor.name);
  }

  format(node: any) {
    this.visit(node);
    return this.output;
  }
}
