'use strict';

let datasource = 'test';
let region = 'eu-central-1';
let components = [
  'api-documentation',
  'api-gateway',
  'article-api',
  'article-oembed',
  'audio-api',
  'auth',
  'grep',
  'image-api',
  'learningpath-api',
  'learningpath-frontend',
  'monitoring',
  'ndla-frontend',
  'oembed-proxy',
  'proxy',
  'test-clients'
];

if (!_.isUndefined(ARGS.datasource)) {
  datasource = ARGS.datasource
}

function getComponentIdentifier(componentName) {
  return datasource + '-' + componentName;
}

function generateTargets(namespace, metricName, dimension, period, getComponentIdentifierCb = getComponentIdentifier) {
  return components.map(function(component) {
    let dimensions = {};
    dimensions[dimension] = getComponentIdentifierCb(component);

    return {
      dimensions,
      namespace,
      metricName,
      region,
      period,
      statistics: [ 'Average' ],
      alias: '{{' + dimension + '}}'
    }
  });
}

function generatePanel(title, targets, type, span = 12) {
  return {
    datasource,
    targets,
    title,
    type,
    span,
    fill: 1,
    linewidth: 2
  }
}

function generateRow(title, panels) {
  return {
    title,
    panels,
    height: '300px',
  }
}
function generateHealthyHostsPanel(span) {
  let healthyHostsPanel = generatePanel(
    'Healthy hosts',
    generateTargets('AWS/ELB', 'HealthyHostCount', 'LoadBalancerName'),
    'table', span);

  healthyHostsPanel['hideTimeOverride'] = false;
  healthyHostsPanel['transform'] = 'timeseries_aggregations';
  healthyHostsPanel['timeFrom'] = '5m';
  healthyHostsPanel['styles'] = [];
  healthyHostsPanel['sort'] = {
    col: 0,
    desc: true,
  };

  return healthyHostsPanel;
}

function generateRDSRow() {
  function getRDSComponentIdentifier(componentName) {
    return 'data-' + datasource + '-' + componentName + '-ndla';
  }

  let panels = [
    generatePanel('Read IOPS', generateTargets('AWS/RDS', 'ReadIOPS', 'DBInstanceIdentifier', '10m', getRDSComponentIdentifier), 'graph', 6),
    generatePanel('Write IOPS', generateTargets('AWS/RDS', 'WriteIOPS', 'DBInstanceIdentifier', '10m', getRDSComponentIdentifier), 'graph', 6),
  ];
  return generateRow('RDS', panels);
}

function generateNetworkRow() {
  let panels = [
    generatePanel('Network In', generateTargets('AWS/EC2', 'NetworkIn', 'AutoScalingGroupName', '10m'), 'graph', 6),
    generatePanel('Network Out', generateTargets('AWS/EC2', 'NetworkOut', 'AutoScalingGroupName', '10m'), 'graph', 6),
  ];

  return generateRow('Network', panels);
}

function generateCPUUtilizationRow() {
  let panels = [
    generatePanel('CPU', generateTargets('AWS/EC2', 'CPUUtilization', 'AutoScalingGroupName', '10m'), 'graph', 10),
    generateHealthyHostsPanel(2)
  ];
  return generateRow('CPU', panels);
}

let dashboard = {
  title: datasource + ' dashboard',
  from: 'now-6h',
  to: 'now',
  rows: [
    generateCPUUtilizationRow(),
    generateNetworkRow(),
    generateRDSRow(),
  ]
};

console.log(dashboard);
return dashboard;