import { runHarness, type Tool, type Turn } from './harness.ts';

let refundCalls = 0;
const tools = new Map<string, Tool>([
  ['lookup_order', { permission: 'allow', run: () => 'Order 1042: $48.00 USD' }],
  ['issue_refund', { permission: 'ask', run: () => { refundCalls++; return 'Simulated refund'; } }],
]);
const turns: Turn[] = [
  { kind: 'load_skill', name: 'refunds' },
  { kind: 'call', tool: 'lookup_order', args: { id: '1042' } },
  { kind: 'call', tool: 'issue_refund', args: { id: '1042', amount: '48.00' } },
];
let index = 0;
const result = await runHarness({
  model: () => JSON.stringify(turns[index++]),
  tools, skills: new Map([['refunds', ['lookup_order', 'issue_refund']]]), maxSteps: 4,
});
for (const event of result.events) console.log(`${event.step} ${event.type}: ${event.detail}`);
console.log(`status: ${result.status}`);
console.log(`simulated refund tool calls: ${refundCalls}`);
