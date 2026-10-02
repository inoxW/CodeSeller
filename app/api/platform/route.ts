import { platformView } from '@/lib/split-checkout';
import { errorResponse } from '@/lib/store-server';
export const dynamic='force-dynamic';
export async function GET(){try{return Response.json(await platformView(),{headers:{'Cache-Control':'no-store'}});}catch(e){return errorResponse(e);}}
