import * as React from "react";
import type { SVGProps } from "react";
const SvgRingChange = (props: SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx={12} cy={12} r={9} opacity={0.3} /><circle cx={12} cy={12} r={4} /><path d="M16.5 7.5 20 4m0 0-3.5.5M20 4l-.5 3.5" /></svg>;
export default SvgRingChange;
