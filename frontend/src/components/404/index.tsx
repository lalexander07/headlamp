import { Dialog, Grid, Typography } from '@material-ui/core';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import headlampBrokenImage from '../../assets/headlamp-404.svg';

export default function NotFoundComponent() {
  const { t } = useTranslation('frequent');
  return (
    <Dialog fullScreen open style={{ overflow: 'hidden' }}>
      <Grid
        justifyContent="center"
        direction="column"
        alignItems="center"
        container
        spacing={2}
        style={{ minHeight: '100vh' }}
      >
        <Grid item>
          <img src={headlampBrokenImage} alt="" />
        </Grid>
        <Grid item>
          <Typography variant="h4">{t(`Whoops! This page doesn't exist`)}</Typography>
        </Grid>
        <Grid item>
          <Typography variant="h6">
            <Trans t={t}>
              Head back <Link to="/">home</Link>.
            </Trans>
          </Typography>
        </Grid>
      </Grid>
    </Dialog>
  );
}