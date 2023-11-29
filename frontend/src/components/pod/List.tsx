import { Icon } from '@iconify/react';
import { Box, Drawer, useMediaQuery } from '@mui/material';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';
import { ApiError } from '../../lib/k8s/apiProxy';
import Pod from '../../lib/k8s/pod';
import { timeAgo } from '../../lib/util';
import { setDetailDrawerOpen } from '../../redux/drawerModeSlice';
import { useTypedSelector } from '../../redux/reducers/reducers';
import { LightTooltip, Link, SimpleTableProps } from '../common';
import { StatusLabel, StatusLabelProps } from '../common/Label';
import ResourceListView from '../common/Resource/ResourceListView';
import { ResourceTableProps } from '../common/Resource/ResourceTable';
import PodDetails from './Details';

export function makePodStatusLabel(pod: Pod) {
  const phase = pod.status.phase;
  let status: StatusLabelProps['status'] = '';

  const { reason, message: tooltip } = pod.getDetailedStatus();

  if (phase === 'Failed') {
    status = 'error';
  } else if (phase === 'Succeeded' || phase === 'Running') {
    const readyCondition = pod.status.conditions.find(condition => condition.type === 'Ready');
    if (readyCondition?.status === 'True' || phase === 'Succeeded') {
      status = 'success';
    } else {
      status = 'warning';
    }
  }

  return (
    <LightTooltip title={tooltip} interactive>
      <Box display="inline">
        <StatusLabel status={status}>
          {reason}
          {(status === 'warning' || status === 'error') && (
            <Box
              aria-label="hidden"
              display="inline"
              paddingTop={1}
              paddingLeft={0.5}
              style={{ verticalAlign: 'text-top' }}
            >
              <Icon icon="mdi:alert-outline" width="1.2rem" height="1.2rem" />
            </Box>
          )}
        </StatusLabel>
      </Box>
    </LightTooltip>
  );
}

function getReadinessGatesStatus(pods: Pod) {
  const readinessGates = pods?.spec?.readinessGates?.map(gate => gate.conditionType) || [];
  const readinessGatesMap: { [key: string]: string } = {};
  if (readinessGates.length === 0) {
    return readinessGatesMap;
  }

  pods?.status?.conditions?.forEach(condition => {
    if (readinessGates.includes(condition.type)) {
      readinessGatesMap[condition.type] = condition.status;
    }
  });

  return readinessGatesMap;
}

export interface PodListProps {
  drawer?: boolean;
  pods: Pod[] | null;
  error: ApiError | null;
  hideColumns?: ('namespace' | 'restarts')[];
  reflectTableInURL?: SimpleTableProps['reflectInURL'];
  noNamespaceFilter?: boolean;
}

export function PodListRenderer(props: PodListProps) {
  const {
    // NOTEZ: This may not be needed
    // drawer,
    pods,
    error,
    hideColumns = [],
    reflectTableInURL = 'pods',
    noNamespaceFilter,
  } = props;
  const { t } = useTranslation(['glossary', 'translation']);

  // USE THIS ---------------------------
  // NOTEZ: Will need to use slices of state for both drwaerEnabled and drawerOpen for every list view
  const drawerEnabled = useTypedSelector(state => state.drawerMode.isDetailDrawerEnabled);
  const drawerOpen = useTypedSelector(state => state.drawerMode.isDetailDrawerOpen);
  const dispatch = useDispatch();

  const mediaQuerySize = useMediaQuery('(min-width: 1200px)');

  // NOTEZ: This is how you get the current url which we need to mark each resource
  // by making sure this resource marker is in the url it prevents multiple drtawers from opening as a stack
  const location = window.location.pathname;
  console.log('location: ', location);
  const isPodsPage = location.includes('pods');

  //  NOTEZ: This is how you get the cluster name from the url
  const params: any = useParams();
  console.log('params: ', params);
  const cluster = params.cluster;

  // NOTEZ: May need to clean this later but it works to refresh the drawer being opened or closed
  useEffect(() => {
    // dispatch(setDetailDrawerOpen(drawerSwitch))
  }, [drawerOpen]);

  function toggleDrawer() {
    //  NOTEZ: dispatching the action to close the drawer which renders in real time
    dispatch(setDetailDrawerOpen(!drawerOpen));

    console.log('CLOSING DRAWER');

    //  NOTEZ: This will need to be custom for each resource,
    //  this allows the drawer to close and the url to update while not refreshing the page
    const newUrl = `/c/${cluster}/pods`;
    window.history.pushState({}, '', newUrl);
  }
  // ---------------------------

  function getDataCols() {
    const dataCols: ResourceTableProps['columns'] = [
      // NOTEZ: replacing the name column with a custom column
      // 'name',
      {
        id: 'name',
        label: t('translation|Name'),
        getter: (pod: Pod) => {
          if (drawerEnabled) {
            return (
              <>
                <Link kubeObject={pod} drawerEnabled={drawerEnabled} />
              </>
            );
          }

          return <Link kubeObject={pod} />;
        },
        sort: (n1: Pod, n2: Pod) => {
          if (n1.metadata.name < n2.metadata.name) {
            return -1;
          } else if (n1.metadata.name > n2.metadata.name) {
            return 1;
          }
          return 0;
        },
      },
      {
        id: 'ready',
        label: t('translation|Ready'),
        getter: (pod: Pod) => {
          const podRow = pod.getDetailedStatus();
          return `${podRow.readyContainers}/${podRow.totalContainers}`;
        },
      },
      {
        id: 'status',
        label: t('translation|Status'),
        getter: makePodStatusLabel,
        sort: (pod: Pod) => {
          const podRow = pod.getDetailedStatus();
          return podRow.reason;
        },
      },
      {
        id: 'ip',
        label: t('glossary|IP'),
        getter: (pod: Pod) => pod.status.podIP,
        sort: true,
      },
      {
        id: 'node',
        label: t('glossary|Node'),
        getter: (pod: Pod) =>
          pod?.spec?.nodeName && (
            <Link routeName="node" params={{ name: pod.spec.nodeName }} tooltip>
              {pod.spec.nodeName}
            </Link>
          ),
        sort: (p1: Pod, p2: Pod) => {
          return p1?.spec?.nodeName?.localeCompare(p2?.spec?.nodeName || '') || 0;
        },
      },
      {
        id: 'nominatedNode',
        label: t('glossary|Nominated Node'),
        getter: (pod: Pod) =>
          !!pod?.status?.nominatedNodeName && (
            <Link routeName="node" params={{ name: pod?.status?.nominatedNodeName }} tooltip>
              {pod?.status?.nominatedNodeName}
            </Link>
          ),
        sort: (p1: Pod, p2: Pod) => {
          return (
            p1?.status?.nominatedNodeName?.localeCompare(p2?.status?.nominatedNodeName || '') || 0
          );
        },
        show: false,
      },
      {
        id: 'readinessGates',
        label: t('glossary|Readiness Gates'),
        getter: (pod: Pod) => {
          const readinessGatesStatus = getReadinessGatesStatus(pod);
          const total = Object.keys(readinessGatesStatus).length;

          if (total === 0) {
            return null;
          }

          const statusTrueCount = Object.values(readinessGatesStatus).filter(
            status => status === 'True'
          ).length;

          return (
            <LightTooltip
              title={Object.keys(readinessGatesStatus)
                .map(conditionType => `${conditionType}: ${readinessGatesStatus[conditionType]}`)
                .join('\n')}
              interactive
            >
              <span>{`${statusTrueCount}/${total}`}</span>
            </LightTooltip>
          );
        },
        sort: (p1: Pod, p2: Pod) => {
          const readinessGatesStatus1 = getReadinessGatesStatus(p1);
          const readinessGatesStatus2 = getReadinessGatesStatus(p2);
          const total1 = Object.keys(readinessGatesStatus1).length;
          const total2 = Object.keys(readinessGatesStatus2).length;

          if (total1 !== total2) {
            return total1 - total2;
          }

          const statusTrueCount1 = Object.values(readinessGatesStatus1).filter(
            status => status === 'True'
          ).length;
          const statusTrueCount2 = Object.values(readinessGatesStatus2).filter(
            status => status === 'True'
          ).length;

          return statusTrueCount1 - statusTrueCount2;
        },
        show: false,
      },
      'age',
    ];

    let insertIndex = 1;

    if (!hideColumns.includes('namespace')) {
      dataCols.splice(insertIndex++, 0, 'namespace');
    }

    if (!hideColumns.includes('restarts')) {
      dataCols.splice(insertIndex++, 0, {
        label: t('Restarts'),
        getter: (pod: Pod) => {
          const { restarts, lastRestartDate } = pod.getDetailedStatus();
          return lastRestartDate.getTime() !== 0
            ? t('{{ restarts }} ({{ abbrevTime }} ago)', {
                restarts: restarts,
                abbrevTime: timeAgo(lastRestartDate, { format: 'mini' }),
              })
            : restarts;
        },
        sort: true,
      });
    }

    return dataCols;
  }

  return (
    <>
      <ResourceListView
        title={t('Pods')}
        headerProps={{
          noNamespaceFilter,
        }}
        errorMessage={Pod.getErrorMessage(error)}
        columns={getDataCols()}
        data={pods}
        reflectInURL={reflectTableInURL}
        id="headlamp-pods"
      />
      {drawerOpen && mediaQuerySize && isPodsPage && (
        <Drawer variant="temporary" anchor="right" open onClose={toggleDrawer}>
          <Box width={800}>
            <PodDetails />
          </Box>
        </Drawer>
      )}
      {/* 
      <p>{`${drawerEnabled}`}</p>
      <p>{`${drawerOpen}`}</p>
      <p>{`${mediaQuerySize}`}</p> */}
    </>
  );
}

export default function PodList(props: { drawer?: boolean }) {
  const [pods, error] = Pod.useList();

  return <PodListRenderer drawer={props.drawer} pods={pods} error={error} reflectTableInURL />;
}
