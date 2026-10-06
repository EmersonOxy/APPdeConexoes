import Image from "next/image";
import Link from "next/link";
export function Brand() {
  return <Link className="brand duoeto-brand" href="/" aria-label="Duoeto — início"><Image src="/brand/logo.png" alt="Duoeto" width={500} height={500} priority className="brand-logo" /></Link>;
}
