import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { BedDouble, Building2, Clock, Mail, MapPin, Pencil, Phone, Plus, Trash2 } from 'lucide-react';
import { PROPERTY_STATUS, humanize } from '@homestay/shared';
import {
  Badge,
  Button,
  Card,
  CardGridSkeleton,
  ConfirmDialog,
  EmptyState,
  Modal,
  PageHeader,
  Pagination,
  SearchBar,
  Select,
  StatusBadge,
  toOptions,
} from '../../components/ui';
import { useMutationSuccess, usePermission } from '../../hooks';
import { PropertyForm } from './PropertyForm';
import { propertiesActions } from './propertiesSlice';

export default function PropertiesPage() {
  const dispatch = useDispatch();
  const allowed = usePermission();
  const { items, pagination, query, status, error, mutation } = useSelector((state) => state.properties);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    dispatch(propertiesActions.fetchList());
  }, [dispatch]);

  useMutationSuccess('properties', propertiesActions.resetMutation, ['create', 'update', 'remove'], () => {
    setEditing(null);
    setDeleting(null);
  });

  const closeEditor = () => {
    setEditing(null);
    dispatch(propertiesActions.resetMutation());
  };

  const submit = (values) =>
    editing?.id
      ? dispatch(propertiesActions.update({ id: editing.id, data: values }))
      : dispatch(propertiesActions.create(values));

  const pending = mutation.status === 'pending';

  return (
    <div>
      <PageHeader
        title="Properties"
        description="Your homestay portfolio with live room availability."
        actions={
          allowed('properties:manage') && (
            <Button icon={Plus} onClick={() => setEditing({})}>
              Add property
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <SearchBar value={query.search} onSearch={(search) => dispatch(propertiesActions.setQuery({ search }))} placeholder="Search name, code or city" />
        <Select
          aria-label="Status filter"
          className="sm:w-44"
          placeholder="All statuses"
          value={query.status ?? ''}
          options={toOptions(Object.values(PROPERTY_STATUS), humanize)}
          onChange={(e) => dispatch(propertiesActions.setQuery({ status: e.target.value }))}
        />
      </div>

      {status === 'loading' && !items.length ? (
        <CardGridSkeleton />
      ) : error ? (
        <Card>
          <EmptyState title="Could not load properties" description={error} />
        </Card>
      ) : !items.length ? (
        <Card>
          <EmptyState icon={Building2} title="No properties found" description="Try a different search or add your first property." />
        </Card>
      ) : (
        <div className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-3 ${status === 'loading' ? 'opacity-60' : ''}`}>
          {items.map((property) => (
            <Card key={property.id} className="flex flex-col overflow-hidden">
              <div className="h-24 bg-gradient-to-br from-brand-700 via-brand-600 to-brand-400 p-4 text-white">
                <div className="flex items-start justify-between">
                  <Badge tone="gray" className="bg-white/90">
                    {property.code}
                  </Badge>
                  <StatusBadge status={property.status} />
                </div>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="text-base font-semibold text-slate-900">{property.name}</h3>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                  <MapPin className="h-3.5 w-3.5" aria-hidden />
                  {property.address.city}, {property.address.state}
                </p>
                {property.description && <p className="mt-3 line-clamp-2 text-sm text-slate-600">{property.description}</p>}
                <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-3 text-center">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">{property.roomCount}</p>
                    <p className="text-xs text-slate-500">Rooms</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-sky-700">{property.occupiedRooms}</p>
                    <p className="text-xs text-slate-500">Occupied</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-emerald-700">{property.availableRooms}</p>
                    <p className="text-xs text-slate-500">Available</p>
                  </div>
                </div>
                <dl className="mt-4 space-y-1.5 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" aria-hidden /> Check-in {property.checkInTime} · Check-out {property.checkOutTime}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" aria-hidden /> {property.phone}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" aria-hidden /> {property.email}
                  </div>
                </dl>
                {property.amenities?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {property.amenities.map((amenity) => (
                      <Badge key={amenity} tone="brand">
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                  <Link to={`/rooms?propertyId=${property.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
                    <BedDouble className="h-4 w-4" aria-hidden /> View rooms
                  </Link>
                  <div className="flex gap-1">
                    {allowed('properties:manage') && (
                      <Button size="icon" variant="ghost" aria-label={`Edit ${property.name}`} onClick={() => setEditing(property)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {allowed('properties:delete') && (
                      <Button size="icon" variant="ghost" aria-label={`Delete ${property.name}`} onClick={() => setDeleting(property)}>
                        <Trash2 className="h-4 w-4 text-rose-600" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="mt-4">
        <Pagination
          {...pagination}
          pageSizes={[9, 18, 36]}
          onPageChange={(page) => dispatch(propertiesActions.setQuery({ page }))}
          onPageSizeChange={(pageSize) => dispatch(propertiesActions.setQuery({ pageSize }))}
        />
      </Card>

      <Modal open={Boolean(editing)} onClose={closeEditor} title={editing?.id ? 'Edit property' : 'Add property'} size="lg">
        {editing && (
          <PropertyForm
            property={editing.id ? editing : null}
            onSubmit={submit}
            onCancel={closeEditor}
            submitting={pending}
            serverErrors={mutation.fieldErrors}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete property?"
        message={`${deleting?.name} will be permanently removed. Properties that still have rooms cannot be deleted.`}
        confirmLabel="Delete"
        loading={pending}
        onClose={() => setDeleting(null)}
        onConfirm={() => dispatch(propertiesActions.remove(deleting.id))}
      />
    </div>
  );
}
