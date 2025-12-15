import Page, { PageHeader } from '@/components/Page'
import React from 'react';
const InventoryProductView = React.lazy(() => import('./product'));
const SerialNumberViewPage = React.lazy(() => import('./serial-number'));
const InventoryMovementViewPage = React.lazy(() => import('./movement'));
import { CONTENT } from '@/constants/content'
import IconButton from '@/components/common/IconButton';
import { EditIcon } from 'lucide-react';
import { useParams } from 'react-router-dom';
import useRedirect from '@/hooks/useRedirect';
import { ROUTE_PATH } from '@/constants';

export type InventoryEntity = 'INVENTORY' | 'SERIAL_NUMBER' | 'MOVEMENT'

export interface EntityPageProps {
entity: InventoryEntity
}

const VIEW_PAGE:  Record<InventoryEntity, React.LazyExoticComponent<React.ComponentType<EntityPageProps>>> = {
    'INVENTORY': InventoryProductView,
    'SERIAL_NUMBER': SerialNumberViewPage,
    'MOVEMENT': InventoryMovementViewPage
} as const

interface ViewPageProps {
    entity: keyof typeof VIEW_PAGE;
}

function ViewPage({ entity }: ViewPageProps) {
  const { id } = useParams()
  const redirect = useRedirect()
    const PageComponent = VIEW_PAGE[entity]
  return (
    <Page header={<PageHeader title={CONTENT.FORM[entity]?.VIEW?.title || "Details"} 
    actions={[
      <IconButton icon={EditIcon} onClick={() => redirect.to(`${entity === 'INVENTORY' ? '': '/inventory'}${ROUTE_PATH[entity]}/${id}/edit`)}>Edit </IconButton>
    ]}/>}>
        <PageComponent entity={entity} />
    </Page>
  )
}

export default ViewPage