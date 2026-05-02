/* eslint-disable no-console */
export const logger = {
  info(msg: string): void {
    console.log(msg);
  },
  step(msg: string): void {
    console.log(`\n› ${msg}`);
  },
  success(msg: string): void {
    console.log(`✓ ${msg}`);
  },
  warn(msg: string): void {
    console.warn(`! ${msg}`);
  },
  error(msg: string): void {
    console.error(`✗ ${msg}`);
  },
  hint(msg: string): void {
    console.error(`  ${msg}`);
  },
};
