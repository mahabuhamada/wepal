import { CircleCheck, CircleDashed, Clock, TriangleAlert } from 'lucide-react';

// أيقونة لكل حالة في «مركز المساعد»، بشكل مختلف لكل حالة (الحالة لا تُعرض باللون وحده).
export const STATE_ICONS = { ok: CircleCheck, warn: TriangleAlert, pending: Clock, planned: CircleDashed };
