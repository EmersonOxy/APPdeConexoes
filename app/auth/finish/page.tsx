import type {Metadata} from 'next';
import {FinishAuth} from '@/components/finish-auth';
export const metadata:Metadata={referrer:'no-referrer',robots:{index:false,follow:false}};
export default function Page(){return <main className="shell page"><h1>Acessando o Duoeto</h1><FinishAuth/></main>}
