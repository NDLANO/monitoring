'use strict';

let datasource = 'test';
let region = 'eu-central-1';

if (!_.isUndefined(ARGS.datasource)) {
  datasource = ARGS.datasource;
}

function generateTargets(namespace, metricName, dimension, period, autoScalingGroupNames, getComponentIdentifierCb = function(name) { return name; }) {
  return autoScalingGroupNames.map(function(componentName) {
    let dimensions = {};
    dimensions[dimension] = getComponentIdentifierCb(componentName);

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
    fill: 0,
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

function generateRDSRow(autoScalingGroupNames) {
  function getRDSComponentIdentifier(autoScalingGroupName) {
    return 'data-' + autoScalingGroupName + '-ndla';
  }

  let panels = [
    generatePanel('Read IOPS', generateTargets('AWS/RDS', 'ReadIOPS', 'DBInstanceIdentifier', '10m', autoScalingGroupNames, getRDSComponentIdentifier), 'graph', 6),
    generatePanel('Write IOPS', generateTargets('AWS/RDS', 'WriteIOPS', 'DBInstanceIdentifier', '10m', autoScalingGroupNames, getRDSComponentIdentifier), 'graph', 6),
  ];
  return generateRow('RDS', panels);
}

function generateNetworkRow(autoScalingGroupNames) {
  let panels = [
    generatePanel('Network In', generateTargets('AWS/EC2', 'NetworkIn', 'AutoScalingGroupName', '10m', autoScalingGroupNames), 'graph', 6),
    generatePanel('Network Out', generateTargets('AWS/EC2', 'NetworkOut', 'AutoScalingGroupName', '10m', autoScalingGroupNames), 'graph', 6),
  ];

  return generateRow('Network', panels);
}

function generateCPUUtilizationRow(autoScalingGroupNames) {
  let panels = [
    generatePanel('CPU', generateTargets('AWS/EC2', 'CPUUtilization', 'AutoScalingGroupName', '10m', autoScalingGroupNames), 'graph', 6),
    generatePanel('ELB Healthy Hosts', generateTargets('AWS/ELB', 'HealthyHostCount', 'LoadBalancerName', '5m', autoScalingGroupNames), 'graph', 6),
  ];
  return generateRow('CPU', panels);
}

function isAutoScalingGroupEntry(metricsListEntry) {
  if (metricsListEntry.Dimensions.length < 1) {
    return false;
  }

  return metricsListEntry.Dimensions[0].Name === "AutoScalingGroupName";
}

function generateDashboard(callback, autoScalingGroupNames) {
  let dashboard = {
    title: datasource + ' dashboard',
    from: 'now-6h',
    to: 'now',
    rows: [
      generateCPUUtilizationRow(autoScalingGroupNames),
      generateNetworkRow(autoScalingGroupNames),
      generateRDSRow(autoScalingGroupNames),
    ]
  };

  callback(dashboard);
}

function getComponentNamesAndGenerateDashboard(dataSourceId, callback) {
  $.ajax({
    method: 'POST',
    url:'/monitoring/api/datasources/proxy/' + dataSourceId,
    data: JSON.stringify({
      region:"eu-central-1",
      action:"ListMetrics",
      parameters: {
        namespace:"AWS/EC2",
        metricName:"CPUUtilization",
        dimensions:[]
      }
    }),
    contentType: "application/json; charset=utf-8",
    dataType: "json",
  }).done(function(result) {
    const autoScalingEntries = result.Metrics.filter(isAutoScalingGroupEntry);
    const autoScalingGroupNames = autoScalingEntries.map(function(entry) { return entry.Dimensions[0].Value; })
    generateDashboard(callback, autoScalingGroupNames);
  });
}

return function(callback) {
  $.ajax({
    method: 'GET',
    url:'/monitoring/api/datasources/id/' + datasource
  }).done(function(dataSourceId) {
    if (dataSourceId) {
      getComponentNamesAndGenerateDashboard(dataSourceId.id, callback);
    }
  });
}
