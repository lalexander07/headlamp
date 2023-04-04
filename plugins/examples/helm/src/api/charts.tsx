export function fetchChartsFromArtifact() {
  return fetch('https://artifacthub.io/api/v1/packages/search?kind=0').then(response =>
    response.json()
  );
}

export function fetchChartDetailFromArtifact(chartName: string, repoName: string) {
  return fetch(`https://artifacthub.io/api/v1/packages/helm/${repoName}/${chartName}`).then(
    response => response.json()
  );
}
