import type { FlowSpec } from '../../../../shared/stepper.ts';

const NODES: FlowSpec['nodes'] = [
  { id: 'meal', label: 'Meal', sub: 'carbohydrate', x: 15, y: 110, w: 110, tone: 'grey' },
  { id: 'blood', label: 'Blood glucose', sub: 'sugar in the blood', x: 175, y: 110, w: 150, tone: 'orange' },
  { id: 'pancreas', label: 'Pancreas', sub: 'makes insulin', x: 400, y: 25, w: 150, tone: 'purple' },
  { id: 'cell', label: 'Muscle and fat cells', sub: 'take in glucose', x: 395, y: 195, w: 170, tone: 'blue' },
  { id: 'safe', label: 'Safe range', sub: 'glucose is normal', x: 620, y: 110, w: 125, tone: 'green' }
];

const EDGES: FlowSpec['edges'] = [
  { from: 'meal', to: 'blood' },
  { from: 'blood', to: 'pancreas' },
  { from: 'pancreas', to: 'cell' },
  { from: 'blood', to: 'cell' },
  { from: 'cell', to: 'safe' }
];

/** The normal insulin mechanism, step by step. */
export const normalFlow: FlowSpec = {
  height: 270,
  nodes: NODES,
  edges: EDGES,
  steps: [
    { title: 'A meal raises glucose', nodes: ['meal', 'blood'], text: 'Food is broken down into glucose. Glucose enters the blood, so the blood glucose level rises.' },
    { title: 'The pancreas releases insulin', nodes: ['blood', 'pancreas'], text: 'The pancreas senses the higher glucose. It releases insulin into the blood.' },
    { title: 'Insulin opens the cells', nodes: ['pancreas', 'cell'], marks: { cell: 'good' }, text: 'Insulin binds to muscle and fat cells. Each cell opens a gate for glucose.' },
    { title: 'Glucose enters the cells', nodes: ['blood', 'cell'], text: 'Glucose moves from the blood into the cells. The cells use it for energy or store it.' },
    { title: 'Glucose returns to a safe range', nodes: ['cell', 'safe'], marks: { safe: 'good' }, text: 'Less glucose stays in the blood, so the level falls back. A small amount of insulin is enough.' }
  ]
};

/** How insulin resistance develops, step by step. */
export const resistanceFlow: FlowSpec = {
  height: 270,
  nodes: NODES,
  edges: EDGES,
  steps: [
    { title: 'The cells respond less', nodes: ['cell'], marks: { cell: 'bad' }, text: 'Fat around the organs and inside muscle makes the cells respond less to insulin. The same amount of insulin opens the gate only a little.' },
    { title: 'Glucose stays in the blood', nodes: ['blood', 'cell'], marks: { blood: 'bad' }, text: 'Less glucose enters the cells, so more of it stays in the blood.' },
    { title: 'The pancreas makes more insulin', nodes: ['blood', 'pancreas'], text: 'The pancreas senses the high glucose. It makes more insulin to push the gate open.' },
    { title: 'For a time, this hides the problem', nodes: ['pancreas', 'cell', 'safe'], marks: { safe: 'good' }, text: 'The extra insulin keeps blood glucose near normal. Tests of glucose alone can look fine, while insulin is already high.' },
    { title: 'The pancreas cannot keep up', nodes: ['pancreas', 'blood'], marks: { pancreas: 'bad', blood: 'bad' }, text: 'After years, the pancreas cannot make enough. Blood glucose rises and stays high. This is the path to type 2 diabetes.' }
  ]
};
