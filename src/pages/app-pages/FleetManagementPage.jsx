import { useCallback, useEffect, useMemo, useState } from 'react'
import EmptyState from '../../components/ui/EmptyState'
import AppModal, { AppModalFooter } from '../../components/ui/AppModal'
import PanelTabs from '../../components/ui/PanelTabs'
import PaginationBar from '../../components/ui/PaginationBar'
import { useAuth } from '../../context/AuthContext'
import { useClientPagination } from '../../hooks/useClientPagination'
import { createEmptyFleetVehicle, listFleetVehicles, saveFleetVehicle, VEHICLE_GEARBOX_OPTIONS } from '../../services/vehicles'
import { listOrganizationUsers, staffToSelectOptions } from '../../services/users'

const maintenanceTypes = [
  'Lavage intérieur',
  'Lavage extérieur',
  'Contrôle pneus',
  'Contrôle huile/liquides',
  'Vidange',
  'Réparations',
  'Dégâts signalés',
]

const emptyFuelForm = {
  id: null,
  vehicleId: '',
  teacher: '',
  date: new Date().toISOString().slice(0, 10),
  mileage: '',
  fuelOperation: 'fuel',
  fuelType: 'SP95',
  chargeLevelAfter: '',
  liters: '',
  kwh: '',
  price: '',
  station: '',
  observations: '',
  ticketPhoto: '',
}

const emptyMaintenanceForm = {
  id: null,
  vehicleId: '',
  type: 'Lavage extérieur',
  date: new Date().toISOString().slice(0, 10),
  reporter: '',
  observations: '',
  photo: '',
}

function flattenFuelLogs(vehicles) {
  return vehicles.flatMap((vehicle) =>
    (vehicle.fuelLogs || []).map((log) => ({ ...log, vehicleId: vehicle.id })),
  )
}

function flattenMaintenanceLogs(vehicles) {
  return vehicles.flatMap((vehicle) =>
    (vehicle.maintenanceLogs || []).map((log) => ({ ...log, vehicleId: vehicle.id })),
  )
}

function applyFuelLogToVehicle(vehicle, log, { isEdit = false } = {}) {
  const mileage = Number(log.mileage || vehicle?.mileage || 0)
  const kmDelta = Math.max(1, Number(log.kmDelta || mileage - Number(vehicle?.mileage || mileage - 1)))
  const liters = Number(log.liters || 0)
  const kwh = Number(log.kwh || 0)
  const nextConsumption = liters ? Number(((liters / kmDelta) * 100).toFixed(1)) : vehicle.averageConsumption

  if (isRechargeEntry(vehicle, log.fuelType)) {
    return {
      ...vehicle,
      mileage: isEdit ? vehicle.mileage : mileage,
      batteryLevel: isEdit ? vehicle.batteryLevel : (Number(log.chargeLevelAfter) || 100),
      chargingStatus: isEdit
        ? vehicle.chargingStatus
        : (Number(log.chargeLevelAfter) >= 100 ? 'Chargé' : 'En charge'),
      estimatedRange: isEdit
        ? vehicle.estimatedRange
        : Math.max(vehicle.estimatedRange, Math.round(kmDelta * 0.9)),
      monthlyKm: isEdit ? vehicle.monthlyKm : vehicle.monthlyKm + kmDelta,
    }
  }

  return {
    ...vehicle,
    mileage: isEdit ? vehicle.mileage : mileage,
    estimatedRange: isEdit
      ? vehicle.estimatedRange
      : Math.round((100 / Math.max(nextConsumption, 1)) * 55),
    averageConsumption: isEdit ? vehicle.averageConsumption : nextConsumption,
    monthlyKm: isEdit ? vehicle.monthlyKm : vehicle.monthlyKm + kmDelta,
  }
}

function applyMaintenanceLogToVehicle(vehicle, log, { isEdit = false } = {}) {
  if (isEdit) return vehicle
  if (log.type.includes('Lavage')) return { ...vehicle, cleanliness: 'propre', interiorState: 'Propre', exteriorState: 'Bon' }
  if (log.type.includes('pneus')) return { ...vehicle, tires: 'OK' }
  if (log.type.includes('huile')) return { ...vehicle, oil: 'OK', coolant: 'OK', adblue: 'OK' }
  if (log.type.includes('Dégâts')) return { ...vehicle, generalState: 'À surveiller', availability: 'Maintenance' }
  return vehicle
}

export default function FleetManagementPage({ role = 'secretary' }) {
  const { organizationId, canWrite } = useAuth()
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [saveError, setSaveError] = useState(null)
  const [selectedVehicleId, setSelectedVehicleId] = useState('')
  const [modal, setModal] = useState(null)
  const [fuelForm, setFuelForm] = useState(emptyFuelForm)
  const [maintenanceForm, setMaintenanceForm] = useState(emptyMaintenanceForm)
  const [vehicleForm, setVehicleForm] = useState(null)
  const [vehicleFormIsNew, setVehicleFormIsNew] = useState(false)
  const [teacherOptions, setTeacherOptions] = useState([])
  const [staffOptions, setStaffOptions] = useState([])

  const refreshVehicles = useCallback(async () => {
    setLoading(true)
    const { vehicles: rows } = await listFleetVehicles()
    setVehicles(rows)
    setLoading(false)
  }, [])

  useEffect(() => {
    refreshVehicles()
  }, [refreshVehicles])

  useEffect(() => {
    listOrganizationUsers().then(({ users }) => {
      setStaffOptions(staffToSelectOptions(users, { roles: ['manager', 'secretary', 'teacher'] }))
      setTeacherOptions(staffToSelectOptions(users, { roles: ['teacher'] }))
    })
  }, [])

  useEffect(() => {
    if (!vehicles.length) {
      setSelectedVehicleId('')
      return
    }
    if (!selectedVehicleId || !vehicles.some((vehicle) => vehicle.id === selectedVehicleId)) {
      setSelectedVehicleId(vehicles[0].id)
    }
  }, [vehicles, selectedVehicleId])

  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === selectedVehicleId) || vehicles[0]

  const fuelLogs = useMemo(() => flattenFuelLogs(vehicles), [vehicles])
  const maintenanceLogs = useMemo(() => flattenMaintenanceLogs(vehicles), [vehicles])

  const stats = useMemo(() => {
    const thermalVehicleIds = vehicles.filter((vehicle) => !isElectric(vehicle)).map((vehicle) => vehicle.id)
    const thermalFuelLogs = fuelLogs.filter((log) => thermalVehicleIds.includes(log.vehicleId))
    const totalFuelCost = thermalFuelLogs.reduce((sum, log) => sum + Number(log.price || 0), 0)
    const totalKm = vehicles.reduce((sum, vehicle) => sum + vehicle.monthlyKm, 0)
    const vehicleCosts = vehicles.map((vehicle) => ({
      label: `${vehicle.brand} ${vehicle.model}`,
      value: isElectric(vehicle)
        ? 0
        : fuelLogs
            .filter((log) => log.vehicleId === vehicle.id)
            .reduce((sum, log) => sum + Number(log.price || 0), 0),
    }))
    const teacherCosts = teacherOptions.map((teacher) => ({
      label: teacher.label,
      value: thermalFuelLogs
        .filter((log) => log.teacher === teacher.value)
        .reduce((sum, log) => sum + Number(log.price || 0), 0),
    }))
    const mostUsed = [...vehicles].sort((a, b) => b.monthlyKm - a.monthlyKm)[0]
    const highestConsumption = [...vehicles]
      .filter((vehicle) => !isElectric(vehicle))
      .sort((a, b) => b.averageConsumption - a.averageConsumption)[0]

    return {
      totalFuelCost,
      totalKm,
      costPerKm: totalKm ? totalFuelCost / totalKm : 0,
      vehicleCosts,
      teacherCosts,
      mostUsed,
      highestConsumption,
    }
  }, [fuelLogs, teacherOptions, vehicles])

  const selectedFuelLogs = selectedVehicle?.fuelLogs || []
  const selectedMaintenanceLogs = selectedVehicle?.maintenanceLogs || []
  const fuelFormVehicle = vehicles.find((vehicle) => vehicle.id === fuelForm.vehicleId) || selectedVehicle
  const fuelFormIsHybrid = isHybrid(fuelFormVehicle)
  const fuelFormIsRecharge = isRechargeEntry(fuelFormVehicle, fuelForm.fuelType)
  const fuelFormFuelTypeOptions = getFuelTypeOptions(
    fuelFormVehicle,
    fuelFormIsRecharge ? 'recharge' : 'fuel',
  )
  const fuelFormIsEdit = Boolean(fuelForm.id)
  const maintenanceFormIsEdit = Boolean(maintenanceForm.id)

  const openVehicleModal = () => {
    if (!selectedVehicle) return
    setVehicleForm(selectedVehicle)
    setVehicleFormIsNew(false)
    setSaveError(null)
    setModal('vehicle')
  }

  const openAddVehicleModal = () => {
    setVehicleForm(createEmptyFleetVehicle())
    setVehicleFormIsNew(true)
    setSaveError(null)
    setModal('vehicle')
  }

  const openFuelModal = (vehicleId = selectedVehicle?.id, log = null) => {
    const vehicle = vehicles.find((item) => item.id === vehicleId) || selectedVehicle
    if (log) {
      setFuelForm(alignFuelFormToVehicle({
        ...emptyFuelForm,
        ...log,
        vehicleId: vehicleId ?? log.vehicleId ?? '',
        mileage: String(log.mileage ?? ''),
        liters: log.liters != null ? String(log.liters) : '',
        kwh: log.kwh != null ? String(log.kwh) : '',
        chargeLevelAfter: log.chargeLevelAfter != null ? String(log.chargeLevelAfter) : '',
        price: log.price != null ? String(log.price) : '',
      }, vehicle))
    } else {
      setFuelForm(alignFuelFormToVehicle({
        ...emptyFuelForm,
        vehicleId: vehicle?.id ?? '',
        mileage: vehicle ? String(vehicle.mileage) : '',
      }, vehicle))
    }
    setSaveError(null)
    setModal('fuel')
  }

  const handleFuelVehicleChange = (vehicleId) => {
    const vehicle = vehicles.find((item) => item.id === vehicleId)
    setFuelForm((current) => alignFuelFormToVehicle({ ...current, vehicleId }, vehicle))
  }

  const handleFuelOperationChange = (operation) => {
    setFuelForm((current) => {
      const vehicle = vehicles.find((item) => item.id === current.vehicleId) || fuelFormVehicle
      const fuelType = operation === 'recharge'
        ? 'Recharge électrique'
        : getDefaultFuelType(vehicle, 'fuel')
      return {
        ...current,
        fuelOperation: operation,
        fuelType,
        kwh: operation === 'recharge' ? current.kwh : '',
        chargeLevelAfter: operation === 'recharge'
          ? getDefaultChargeLevelAfter(vehicle, {})
          : '',
        liters: operation === 'fuel' ? current.liters : '',
        price: operation === 'fuel' ? current.price : '',
      }
    })
  }

  const openMaintenanceModal = (vehicleId = selectedVehicle?.id, log = null) => {
    if (log) {
      setMaintenanceForm({
        ...emptyMaintenanceForm,
        ...log,
        vehicleId: vehicleId ?? log.vehicleId ?? '',
      })
    } else {
      setMaintenanceForm({ ...emptyMaintenanceForm, vehicleId: vehicleId ?? '' })
    }
    setSaveError(null)
    setModal('maintenance')
  }

  const persistVehicle = async (updatedVehicle) => {
    if (!canWrite || !organizationId) {
      setSaveError('Modification impossible : accès en lecture seule.')
      return null
    }
    const { vehicle, error } = await saveFleetVehicle(updatedVehicle, organizationId)
    if (error) {
      setSaveError(error)
      return null
    }
    setVehicles((current) => current.map((item) => (item.id === vehicle.id ? vehicle : item)))
    return vehicle
  }

  const saveVehicle = async (event) => {
    event.preventDefault()
    if (!canWrite) {
      setSaveError('Modification impossible : accès en lecture seule.')
      return
    }
    if (!organizationId) {
      setSaveError('Organisation introuvable.')
      return
    }
    if (!vehicleForm.brand?.trim() || !vehicleForm.model?.trim() || !vehicleForm.plate?.trim()) {
      setSaveError('Indiquez la marque, le modèle et l\'immatriculation.')
      return
    }

    setSaveError(null)
    const { vehicle, error } = await saveFleetVehicle(vehicleForm, organizationId)
    if (error) {
      setSaveError(error)
      return
    }

    setVehicles((current) => {
      const exists = current.some((item) => item.id === vehicle.id)
      return exists
        ? current.map((item) => (item.id === vehicle.id ? vehicle : item))
        : [...current, vehicle]
    })
    setSelectedVehicleId(vehicle.id)
    setModal(null)
    setVehicleForm(null)
    setVehicleFormIsNew(false)
  }

  const saveFuel = async (event) => {
    event.preventDefault()
    const vehicle = vehicles.find((item) => item.id === fuelForm.vehicleId)
    if (!vehicle) return

    const electric = isRechargeEntry(vehicle, fuelForm.fuelType)
    const mileage = Number(fuelForm.mileage || vehicle.mileage || 0)
    const kmDelta = Math.max(1, mileage - Number(vehicle.mileage || mileage - 1))
    const liters = Number(fuelForm.liters || 0)
    const kwh = Number(fuelForm.kwh || 0)
    const nextLog = {
      ...fuelForm,
      id: fuelForm.id || Date.now(),
      mileage,
      liters,
      kwh,
      chargeLevelAfter: electric ? Number(fuelForm.chargeLevelAfter || vehicle.batteryLevel || 0) : undefined,
      price: electric ? 0 : Number(fuelForm.price || 0),
      kmDelta: fuelForm.id ? Number(fuelForm.kmDelta || kmDelta) : kmDelta,
      ticketPhoto: fuelForm.ticketPhoto || (electric ? 'justificatif-recharge.jpg' : 'ticket-simule.jpg'),
    }

    const vehicleFuelLogs = vehicle.fuelLogs || []
    const updatedFuelLogs = fuelForm.id
      ? vehicleFuelLogs.map((item) => (item.id === fuelForm.id ? nextLog : item))
      : [nextLog, ...vehicleFuelLogs]

    const updatedVehicle = applyFuelLogToVehicle(
      { ...vehicle, fuelLogs: updatedFuelLogs },
      nextLog,
      { isEdit: Boolean(fuelForm.id) },
    )

    const saved = await persistVehicle(updatedVehicle)
    if (!saved) return

    setSelectedVehicleId(fuelForm.vehicleId)
    setModal(null)
    setFuelForm(emptyFuelForm)
  }

  const saveMaintenance = async (event) => {
    event.preventDefault()
    const vehicle = vehicles.find((item) => item.id === maintenanceForm.vehicleId)
    if (!vehicle) return

    const nextLog = {
      ...maintenanceForm,
      id: maintenanceForm.id || Date.now(),
      photo: maintenanceForm.photo || '',
    }

    const vehicleMaintenanceLogs = vehicle.maintenanceLogs || []
    const updatedMaintenanceLogs = maintenanceForm.id
      ? vehicleMaintenanceLogs.map((item) => (item.id === maintenanceForm.id ? nextLog : item))
      : [nextLog, ...vehicleMaintenanceLogs]

    const updatedVehicle = applyMaintenanceLogToVehicle(
      { ...vehicle, maintenanceLogs: updatedMaintenanceLogs },
      nextLog,
      { isEdit: Boolean(maintenanceForm.id) },
    )

    const saved = await persistVehicle(updatedVehicle)
    if (!saved) return

    setSelectedVehicleId(maintenanceForm.vehicleId)
    setModal(null)
    setMaintenanceForm(emptyMaintenanceForm)
  }

  const deleteFuelLog = async (log) => {
    if (!canWrite) return
    if (!window.confirm('Supprimer cet enregistrement carburant ?')) return

    const vehicle = vehicles.find((item) => item.id === selectedVehicle?.id)
    if (!vehicle) return

    const updatedVehicle = {
      ...vehicle,
      fuelLogs: (vehicle.fuelLogs || []).filter((item) => item.id !== log.id),
    }

    await persistVehicle(updatedVehicle)
  }

  const deleteMaintenanceLog = async (log) => {
    if (!canWrite) return
    if (!window.confirm('Supprimer cette intervention ?')) return

    const vehicle = vehicles.find((item) => item.id === selectedVehicle?.id)
    if (!vehicle) return

    const updatedVehicle = {
      ...vehicle,
      maintenanceLogs: (vehicle.maintenanceLogs || []).filter((item) => item.id !== log.id),
    }

    await persistVehicle(updatedVehicle)
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <Hero
        canAddVehicle={canWrite}
        onAddVehicle={openAddVehicleModal}
        role={role}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Véhicules suivis" value={vehicles.length} />
        <Kpi label="Coût carburant mois" value={`${stats.totalFuelCost.toFixed(2)} EUR`} tone="amber" />
        <Kpi label="Kilomètres mois" value={`${stats.totalKm} km`} tone="emerald" />
        <Kpi label="Coût moyen/km" value={`${stats.costPerKm.toFixed(2)} EUR`} tone="cyan" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="rounded-[2rem] border-2 border-slate-300 bg-white/85 p-5 shadow-[var(--shadow-card)] backdrop-blur-xl">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-950">Flotte auto-école</h2>
              <p className="mt-1 text-sm text-slate-500">Cliquez un véhicule pour ouvrir sa fiche complète.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canWrite && (
                <button
                  className="rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-cyan-700"
                  onClick={openAddVehicleModal}
                  type="button"
                >
                  + Ajouter un véhicule
                </button>
              )}
              {selectedVehicle && (
                <button
                  className="rounded-2xl bg-navy-950 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-cyan-700"
                  onClick={openVehicleModal}
                  type="button"
                >
                  Modifier la fiche
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <p className="mt-5 text-sm font-medium text-slate-500">Chargement de la flotte…</p>
          ) : !vehicles.length ? (
            <div className="mt-5">
              <EmptyState
                title="Aucun véhicule enregistré"
                message="Ajoutez un véhicule pour suivre votre flotte, les pleins et l'entretien."
                icon="🚗"
              />
              {canWrite && (
                <div className="mt-4 flex justify-center">
                  <button
                    className="rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-black text-navy-950 shadow-xl transition hover:bg-white"
                    onClick={openAddVehicleModal}
                    type="button"
                  >
                    + Ajouter un véhicule
                  </button>
                </div>
              )}
            </div>
          ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {vehicles.map((vehicle) => (
              <button
                className={`rounded-[1.5rem] border p-4 text-left transition hover:-translate-y-1 hover:shadow-xl ${
                  selectedVehicleId === vehicle.id
                    ? 'border-cyan-300 bg-cyan-50 shadow-lg ring-4 ring-cyan-100'
                    : 'border-slate-300 bg-white'
                }`}
                key={vehicle.id}
                onClick={() => setSelectedVehicleId(vehicle.id)}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-slate-950">{vehicle.brand} {vehicle.model}</h3>
                    <p className="text-sm font-bold text-slate-500">{vehicle.plate}</p>
                  </div>
                  <StatusBadge value={vehicle.availability} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <MiniInfo label="Km" value={`${vehicle.mileage.toLocaleString('fr-FR')}`} />
                  {isElectric(vehicle) ? (
                    <>
                      <MiniInfo label="Batterie" value={`${vehicle.batteryLevel}%`} />
                      <MiniInfo label="Recharge" value={vehicle.chargingStatus} />
                    </>
                  ) : (
                    <MiniInfo label="Conso" value={`${vehicle.averageConsumption} L/100`} />
                  )}
                  <MiniInfo label="Propreté" value={vehicle.cleanliness} />
                </div>
              </button>
            ))}
          </div>
          )}
        </div>

        <aside className="rounded-[2rem] border-2 border-slate-300 bg-white p-5 shadow-[var(--shadow-card)]">
          <p className="text-xs font-black uppercase tracking-wide text-cyan-700">Fiche véhicule</p>
          {!selectedVehicle ? (
            <EmptyState
              className="mt-4"
              title="Aucun véhicule sélectionné"
              message="Ajoutez un véhicule pour afficher sa fiche détaillée."
              icon="🚗"
            />
          ) : (
          <>
          <h2 className="mt-2 text-2xl font-extrabold text-slate-950">
            {selectedVehicle.brand} {selectedVehicle.model}
          </h2>
          <p className="mt-1 text-sm font-bold text-slate-500">{selectedVehicle.plate}</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Info label="État général" value={selectedVehicle.generalState} />
            <Info label="Intérieur" value={selectedVehicle.interiorState} />
            <Info label="Extérieur" value={selectedVehicle.exteriorState} />
            <Info label="Pneus" value={selectedVehicle.tires} />
            {isElectric(selectedVehicle) ? (
              <>
                <Info label="Batterie" value={`${selectedVehicle.batteryLevel}%`} />
                <Info label="État de recharge" value={selectedVehicle.chargingStatus} />
              </>
            ) : (
              <>
                <Info label="Consommation moyenne" value={`${selectedVehicle.averageConsumption} L/100`} />
                <Info label="Huile" value={selectedVehicle.oil} />
                <Info label="Liquide refroidissement" value={selectedVehicle.coolant} />
                {selectedVehicle.energy === 'diesel' && <Info label="AdBlue" value={selectedVehicle.adblue} />}
              </>
            )}
            <Info label="Autonomie" value={`${selectedVehicle.estimatedRange} km`} />
            <Info label="Contrôle technique" value={formatDate(selectedVehicle.technicalControl)} />
          </div>

          {canWrite && (
          <div className="mt-5 grid gap-2">
            <button className="rounded-2xl bg-navy-950 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-cyan-700" onClick={() => openFuelModal(selectedVehicle.id)} type="button">
            {isElectric(selectedVehicle) ? (
              '+ Ajouter une recharge'
            ) : isHybrid(selectedVehicle) ? (
              '+ Plein / recharge'
            ) : (
              '+ Ajouter un plein'
            )}
            </button>
            <button className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-extrabold text-cyan-700 transition hover:bg-cyan-100" onClick={() => openMaintenanceModal(selectedVehicle.id)} type="button">
              + Entretien / dégâts
            </button>
          </div>
          )}
          </>
          )}
        </aside>
      </section>

      <section>
        <HistoryPanel
          canEdit={canWrite}
          fuelLogs={selectedFuelLogs}
          maintenanceLogs={selectedMaintenanceLogs}
          onDeleteFuel={deleteFuelLog}
          onDeleteMaintenance={deleteMaintenanceLog}
          onEditFuel={(log) => openFuelModal(selectedVehicle?.id, log)}
          onEditMaintenance={(log) => openMaintenanceModal(selectedVehicle?.id, log)}
          selectedVehicle={selectedVehicle}
          vehicles={vehicles}
        />
      </section>

      <ManagerStats stats={stats} vehicles={vehicles} fuelLogs={fuelLogs} />

      <AppModal
        open={modal === 'fuel'}
        onClose={() => setModal(null)}
        eyebrow="Gestion flotte"
        title={fuelFormIsEdit
          ? (fuelFormIsRecharge ? 'Modifier la recharge' : 'Modifier le plein carburant')
          : (fuelFormIsRecharge ? 'Ajouter une recharge' : fuelFormIsHybrid ? 'Ajouter un plein ou une recharge' : 'Ajouter un plein carburant')}
        size="xl"
        zIndex={100}
        footer={(
          <AppModalFooter
            onClose={() => setModal(null)}
            submitForm="fleet-fuel-form"
            submitLabel={fuelFormIsEdit
              ? (fuelFormIsRecharge ? 'Enregistrer la recharge' : 'Enregistrer le plein')
              : (fuelFormIsRecharge ? 'Enregistrer la recharge' : 'Enregistrer le plein')}
          />
        )}
      >
        <form id="fleet-fuel-form" className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={saveFuel}>
            {saveError && (
              <p className="md:col-span-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {saveError}
              </p>
            )}
            <Select label="Véhicule" onChange={handleFuelVehicleChange} options={vehicles.map((vehicle) => ({ label: `${vehicle.brand} ${vehicle.model} · ${vehicle.plate}`, value: vehicle.id }))} value={fuelForm.vehicleId} />
            <Select label="Enseignant" onChange={(value) => setFuelForm((current) => ({ ...current, teacher: value }))} options={[{ label: '— Sélectionner —', value: '' }, ...teacherOptions]} value={fuelForm.teacher} />
            <Field label="Date" onChange={(value) => setFuelForm((current) => ({ ...current, date: value }))} type="date" value={fuelForm.date} />
            <Field label="Kilométrage" onChange={(value) => setFuelForm((current) => ({ ...current, mileage: value }))} type="number" value={fuelForm.mileage} />
            {fuelFormIsHybrid && (
              <Select
                label="Type d'opération"
                onChange={handleFuelOperationChange}
                options={[
                  { label: 'Plein carburant (SP95 / SP98)', value: 'fuel' },
                  { label: 'Recharge électrique', value: 'recharge' },
                ]}
                value={fuelForm.fuelOperation || (fuelFormIsRecharge ? 'recharge' : 'fuel')}
              />
            )}
            {fuelFormIsRecharge ? (
              <>
                <RechargeSlider
                  currentLevel={fuelFormVehicle?.batteryLevel ?? 0}
                  onChange={(value) => setFuelForm((current) => ({
                    ...current,
                    chargeLevelAfter: value,
                    fuelType: 'Recharge électrique',
                  }))}
                  value={fuelForm.chargeLevelAfter !== '' && fuelForm.chargeLevelAfter != null
                    ? fuelForm.chargeLevelAfter
                    : getDefaultChargeLevelAfter(fuelFormVehicle, fuelForm)}
                />
                <FileField label="Photo du justificatif de recharge" onChange={(value) => setFuelForm((current) => ({ ...current, ticketPhoto: value }))} value={fuelForm.ticketPhoto} />
              </>
            ) : (
              <>
                {fuelFormFuelTypeOptions.length === 1 ? (
                  <ReadOnlyField label="Type carburant" value={fuelFormFuelTypeOptions[0]} />
                ) : (
                  <Select label="Type carburant" onChange={(value) => setFuelForm((current) => ({ ...current, fuelType: value }))} options={fuelFormFuelTypeOptions} value={fuelForm.fuelType} />
                )}
                <Field label="Litres ajoutés" onChange={(value) => setFuelForm((current) => ({ ...current, liters: value }))} type="number" value={fuelForm.liters} />
                <Field label="Prix total payé (EUR)" onChange={(value) => setFuelForm((current) => ({ ...current, price: value }))} type="number" value={fuelForm.price} />
                <Field label="Station service" onChange={(value) => setFuelForm((current) => ({ ...current, station: value }))} value={fuelForm.station} />
                <FileField label="Photo du ticket carburant" onChange={(value) => setFuelForm((current) => ({ ...current, ticketPhoto: value }))} value={fuelForm.ticketPhoto} />
              </>
            )}
            <Field className="md:col-span-2" label="Observations" onChange={(value) => setFuelForm((current) => ({ ...current, observations: value }))} value={fuelForm.observations} />
        </form>
      </AppModal>

      <AppModal
        open={modal === 'maintenance'}
        onClose={() => setModal(null)}
        eyebrow="Gestion flotte"
        title={maintenanceFormIsEdit ? 'Modifier entretien ou dégât' : 'Ajouter entretien ou dégât'}
        size="xl"
        zIndex={100}
        footer={(
          <AppModalFooter
            onClose={() => setModal(null)}
            submitForm="fleet-maintenance-form"
            submitLabel={maintenanceFormIsEdit ? 'Enregistrer les modifications' : 'Enregistrer intervention'}
          />
        )}
      >
        <form id="fleet-maintenance-form" className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={saveMaintenance}>
            {saveError && (
              <p className="md:col-span-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {saveError}
              </p>
            )}
            <Select label="Véhicule" onChange={(value) => setMaintenanceForm((current) => ({ ...current, vehicleId: value }))} options={vehicles.map((vehicle) => ({ label: `${vehicle.brand} ${vehicle.model} · ${vehicle.plate}`, value: vehicle.id }))} value={maintenanceForm.vehicleId} />
            <Select label="Type intervention" onChange={(value) => setMaintenanceForm((current) => ({ ...current, type: value }))} options={maintenanceTypes} value={maintenanceForm.type} />
            <Field label="Date intervention" onChange={(value) => setMaintenanceForm((current) => ({ ...current, date: value }))} type="date" value={maintenanceForm.date} />
            <Select label="Signalé par" onChange={(value) => setMaintenanceForm((current) => ({ ...current, reporter: value }))} options={[{ label: '— Sélectionner —', value: '' }, ...staffOptions]} value={maintenanceForm.reporter} />
            <FileField label="Photos dégâts / intervention" onChange={(value) => setMaintenanceForm((current) => ({ ...current, photo: value }))} value={maintenanceForm.photo} />
            <Field className="md:col-span-2" label="Observations" onChange={(value) => setMaintenanceForm((current) => ({ ...current, observations: value }))} value={maintenanceForm.observations} />
        </form>
      </AppModal>

      <AppModal
        open={modal === 'vehicle' && Boolean(vehicleForm)}
        onClose={() => setModal(null)}
        eyebrow="Gestion flotte"
        title={vehicleFormIsNew ? 'Ajouter un véhicule' : 'Modifier la fiche véhicule'}
        size="xl"
        zIndex={100}
        footer={(
          <AppModalFooter
            onClose={() => setModal(null)}
            submitForm="fleet-vehicle-form"
            submitLabel={vehicleFormIsNew ? 'Ajouter le véhicule' : 'Enregistrer le véhicule'}
          />
        )}
      >
        {vehicleForm && (
        <form id="fleet-vehicle-form" className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={saveVehicle}>
            <Field label="Marque *" onChange={(value) => setVehicleForm((current) => ({ ...current, brand: value }))} value={vehicleForm.brand} />
            <Field label="Modèle *" onChange={(value) => setVehicleForm((current) => ({ ...current, model: value }))} value={vehicleForm.model} />
            <Field label="Immatriculation *" onChange={(value) => setVehicleForm((current) => ({ ...current, plate: value }))} value={vehicleForm.plate} />
            <Select label="Énergie" onChange={(value) => setVehicleForm((current) => ({ ...current, energy: value }))} options={['essence', 'diesel', 'électrique', 'hybride']} value={vehicleForm.energy} />
            <Select
              label="Boîte de vitesses"
              onChange={(value) => setVehicleForm((current) => ({ ...current, gearbox: value }))}
              options={VEHICLE_GEARBOX_OPTIONS}
              value={vehicleForm.gearbox || 'manuelle'}
            />
            <Field label="Kilométrage actuel" onChange={(value) => setVehicleForm((current) => ({ ...current, mileage: Number(value) || 0 }))} type="number" value={String(vehicleForm.mileage)} />
            <Select label="Disponibilité véhicule" onChange={(value) => setVehicleForm((current) => ({ ...current, availability: value }))} options={['Disponible', 'Maintenance', 'Indisponible']} value={vehicleForm.availability} />
            <Select label="Propreté" onChange={(value) => setVehicleForm((current) => ({ ...current, cleanliness: value }))} options={['propre', 'à nettoyer', 'urgent lavage']} value={vehicleForm.cleanliness} />
            <Select label="État pneus" onChange={(value) => setVehicleForm((current) => ({ ...current, tires: value }))} options={['OK', 'À vérifier', 'À remplacer']} value={vehicleForm.tires} />
            {isElectric(vehicleForm) ? (
              <>
                <Field label="Niveau batterie (%)" onChange={(value) => setVehicleForm((current) => ({ ...current, batteryLevel: Number(value) }))} type="number" value={String(vehicleForm.batteryLevel || 0)} />
                <Field label="État de recharge" onChange={(value) => setVehicleForm((current) => ({ ...current, chargingStatus: value }))} value={vehicleForm.chargingStatus || ''} />
              </>
            ) : null}
            <Field label="Contrôle technique" onChange={(value) => setVehicleForm((current) => ({ ...current, technicalControl: value }))} type="date" value={vehicleForm.technicalControl} />
            {saveError && (
              <p className="md:col-span-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {saveError}
              </p>
            )}
        </form>
        )}
      </AppModal>
    </div>
  )
}

function Hero({ canAddVehicle, onAddVehicle, role }) {
  const roleLabel = role === 'manager' ? 'Gérant' : role === 'teacher' ? 'Enseignant' : 'Secrétariat'

  return (
    <section className="overflow-hidden rounded-[2rem] border-2 border-slate-300 bg-white shadow-[var(--shadow-card)]">
      <div className="bg-gradient-to-br from-navy-950 via-navy-900 to-cyan-900 p-6 text-white md:p-8">
        <span className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-1 text-sm font-semibold text-cyan-100">
          {roleLabel}
        </span>
        <div className="mt-5 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Gestion des véhicules</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-blue-50">
              Suivi complet de flotte auto-école : état, pleins enregistrés, entretien, alertes et coûts.
            </p>
          </div>
          {canAddVehicle && (
            <button className="rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-black text-navy-950 shadow-xl transition hover:-translate-y-0.5 hover:bg-white" onClick={onAddVehicle} type="button">
              + Ajouter un véhicule
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

function HistoryPanel({
  canEdit,
  fuelLogs,
  maintenanceLogs,
  onDeleteFuel,
  onDeleteMaintenance,
  onEditFuel,
  onEditMaintenance,
  selectedVehicle,
  vehicles,
}) {
  const [historyTab, setHistoryTab] = useState('fuel')
  const electric = isElectric(selectedVehicle)
  const hybrid = isHybrid(selectedVehicle)
  const fuelSectionTitle = electric
    ? 'Historique de recharge'
    : hybrid
      ? 'Pleins et recharges'
      : 'Pleins carburant'

  const {
    page: fuelPage,
    setPage: setFuelPage,
    totalPages: fuelTotalPages,
    totalItems: fuelTotalItems,
    pageItems: fuelPageItems,
    pageSize: fuelPageSize,
  } = useClientPagination(fuelLogs, { pageSize: 5 })

  const {
    page: maintenancePage,
    setPage: setMaintenancePage,
    totalPages: maintenanceTotalPages,
    totalItems: maintenanceTotalItems,
    pageItems: maintenancePageItems,
    pageSize: maintenancePageSize,
  } = useClientPagination(maintenanceLogs, { pageSize: 5 })

  return (
    <section className="rounded-[2rem] border-2 border-slate-300 bg-white p-5 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-2xl font-extrabold text-slate-950">Historique du véhicule sélectionné</h2>
        <PanelTabs
          activeId={historyTab}
          onChange={setHistoryTab}
          tabs={[
            { id: 'fuel', label: fuelSectionTitle, badge: fuelLogs.length },
            { id: 'maintenance', label: 'Entretien et dégâts', badge: maintenanceLogs.length },
          ]}
        />
      </div>

      {historyTab === 'fuel' && (
        <div className="mt-5">
          <div className="space-y-3">
            {fuelPageItems.map((log) => {
              const logIsRecharge = isRechargeEntry(selectedVehicle, log.fuelType)
              return (
              <article className="rounded-2xl border-2 border-slate-300 bg-slate-50 p-4" key={log.id}>
                <div className="flex justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold text-slate-950">{formatDate(log.date)} · {log.teacher}</p>
                    <p className="text-sm text-slate-500">{log.station} · {log.fuelType} · {log.ticketPhoto}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {!logIsRecharge && <p className="font-black text-cyan-700">{Number(log.price).toFixed(2)} EUR</p>}
                    {canEdit && (
                      <div className="flex gap-2">
                        <button
                          className="rounded-xl border-2 border-slate-300 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-700 transition hover:bg-slate-100"
                          onClick={() => onEditFuel(log)}
                          type="button"
                        >
                          Modifier
                        </button>
                        <button
                          className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-extrabold text-white transition hover:bg-rose-500"
                          onClick={() => onDeleteFuel(log)}
                          type="button"
                        >
                          Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {logIsRecharge
                    ? `${log.chargeLevelAfter != null ? `${log.chargeLevelAfter}%` : `${log.kwh || 0} kWh`} · ${log.kmDelta} km parcourus`
                    : `${log.liters} L · ${log.kmDelta} km · ${log.liters ? ((log.liters / log.kmDelta) * 100).toFixed(1) : '0'} L/100`}
                </p>
              </article>
              )
            })}
            {!fuelLogs.length && <InlineNotice label={electric ? 'Aucune recharge enregistrée pour ce véhicule.' : hybrid ? 'Aucun plein ou recharge enregistré pour ce véhicule.' : 'Aucun plein enregistré pour ce véhicule.'} />}
          </div>
          <PaginationBar
            className="mt-4"
            onPageChange={setFuelPage}
            page={fuelPage}
            pageSize={fuelPageSize}
            totalItems={fuelTotalItems}
            totalPages={fuelTotalPages}
          />
        </div>
      )}

      {historyTab === 'maintenance' && (
        <div className="mt-5">
          <div className="space-y-3">
            {maintenancePageItems.map((log) => (
              <article className="rounded-2xl border-2 border-slate-300 bg-slate-50 p-4" key={log.id}>
                <div className="flex justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold text-slate-950">{log.type}</p>
                    <p className="text-sm text-slate-500">{formatDate(log.date)} · {log.reporter}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {log.photo && <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700">photo</span>}
                    {canEdit && (
                      <div className="flex gap-2">
                        <button
                          className="rounded-xl border-2 border-slate-300 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-700 transition hover:bg-slate-100"
                          onClick={() => onEditMaintenance(log)}
                          type="button"
                        >
                          Modifier
                        </button>
                        <button
                          className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-extrabold text-white transition hover:bg-rose-500"
                          onClick={() => onDeleteMaintenance(log)}
                          type="button"
                        >
                          Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-sm text-slate-600">{log.observations}</p>
              </article>
            ))}
            {!maintenanceLogs.length && <InlineNotice label="Aucune intervention enregistrée." />}
          </div>
          <PaginationBar
            className="mt-4"
            onPageChange={setMaintenancePage}
            page={maintenancePage}
            pageSize={maintenancePageSize}
            totalItems={maintenanceTotalItems}
            totalPages={maintenanceTotalPages}
          />
        </div>
      )}

      <p className="mt-4 text-xs font-semibold text-slate-400">
        Flotte suivie : {vehicles.map((vehicle) => vehicle.plate).join(', ')}
      </p>
    </section>
  )
}

function ManagerStats({ fuelLogs, stats, vehicles }) {
  return (
    <section className="rounded-[2rem] border-2 border-slate-300 bg-white p-5 shadow-[var(--shadow-card)]">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-950">Statistiques Gérant</h2>
          <p className="mt-1 text-sm text-slate-500">Coûts, kilométrage, utilisation et historique enseignant/véhicule.</p>
        </div>
        <span className="rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-black text-cyan-700">
          {fuelLogs.length} opérations carburant
        </span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <Info label="Véhicule le plus utilisé" value={stats.mostUsed ? `${stats.mostUsed.brand} ${stats.mostUsed.model} · ${stats.mostUsed.monthlyKm} km` : '—'} />
        <Info label="Consomme le plus" value={stats.highestConsumption ? `${stats.highestConsumption.brand} ${stats.highestConsumption.model} · ${stats.highestConsumption.averageConsumption} L/100` : '—'} />
        <Info label="Historique flotte" value={`${vehicles.reduce((sum, vehicle) => sum + vehicle.mileage, 0).toLocaleString('fr-FR')} km cumulés`} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <BarChart title="Coût par véhicule" items={stats.vehicleCosts} suffix="EUR" />
        <BarChart title="Coût par enseignant" items={stats.teacherCosts} suffix="EUR" />
      </div>
    </section>
  )
}

function BarChart({ items, suffix, title }) {
  const max = Math.max(...items.map((item) => item.value), 1)
  return (
    <div className="rounded-[1.5rem] border-2 border-slate-300 bg-slate-50 p-4">
      <h3 className="font-black text-slate-950">{title}</h3>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.label}>
            <div className="flex justify-between gap-3 text-sm">
              <span className="font-bold text-slate-600">{item.label}</span>
              <span className="font-black text-slate-900">{item.value.toFixed(2)} {suffix}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-white">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-cyan-300" style={{ width: `${(item.value / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Kpi({ label, tone = 'cyan', value }) {
  const color = tone === 'emerald' ? 'text-emerald-600' : tone === 'amber' ? 'text-amber-600' : 'text-cyan-600'
  return (
    <article className="rounded-[1.5rem] border-2 border-slate-300 bg-white p-5 shadow-[var(--shadow-soft)]">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-black ${color}`}>{value}</p>
    </article>
  )
}

function MiniInfo({ label, value }) {
  return (
    <div className="rounded-2xl border-2 border-slate-300 bg-white px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm font-extrabold text-slate-900">{value}</p>
    </div>
  )
}

function RechargeSlider({ currentLevel = 0, onChange, value }) {
  const start = Math.max(0, Math.min(100, Number(currentLevel) || 0))
  const target = Math.max(0, Math.min(100, Number(value ?? start) || 0))
  const added = Math.max(0, target - start)
  const full = target >= 100

  return (
    <div className="md:col-span-2">
      <span className="text-sm font-bold text-slate-700">Barre de recharge</span>
      <p className="mt-1 text-xs font-medium text-slate-500">Glissez vers la droite pour indiquer le niveau atteint après recharge.</p>
      <div className="mt-3 rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-50 to-emerald-50/60 p-4">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-bold text-slate-600">{start}% en fiche</span>
          <span className={`rounded-full px-3 py-1 text-xs font-black ${full ? 'bg-emerald-100 text-emerald-700' : 'bg-cyan-100 text-cyan-700'}`}>
            {full ? 'Plein — 100%' : `Après recharge : ${target}%`}
          </span>
        </div>
        <div className="relative mt-4 h-5 overflow-hidden rounded-full bg-white shadow-inner">
          <div
            aria-hidden
            className="absolute inset-y-0 left-0 rounded-full bg-slate-200/80"
            style={{ width: `${start}%` }}
          />
          <div
            aria-hidden
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-600 via-cyan-400 to-emerald-400 transition-all duration-200"
            style={{ width: `${target}%` }}
          />
        </div>
        <input
          aria-label="Niveau de recharge"
          className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-cyan-100 accent-cyan-600 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-cyan-600 [&::-webkit-slider-thumb]:shadow-md"
          max={100}
          min={0}
          onChange={(event) => onChange(event.target.value)}
          step={1}
          type="range"
          value={target}
        />
        {start >= 100 && target < 100 ? (
          <p className="mt-2 text-xs font-medium text-amber-700">Batterie pleine en fiche — ajustez le curseur au niveau réel après recharge.</p>
        ) : added > 0 ? (
          <p className="mt-2 text-xs font-bold text-cyan-700">+{added}% · niveau final {target}%</p>
        ) : (
          <p className="mt-2 text-xs font-medium text-slate-500">Déplacez le curseur vers la droite pour enregistrer une recharge.</p>
        )}
      </div>
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div className="rounded-2xl border-2 border-slate-300 bg-slate-50 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 font-extrabold text-slate-900">{value}</p>
    </div>
  )
}

function StatusBadge({ value }) {
  const style = value === 'Disponible' ? 'bg-emerald-50 text-emerald-700' : value === 'Maintenance' || value === 'Indisponible' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
  return <span className={`rounded-full px-3 py-1 text-xs font-black ${style}`}>{value}</span>
}

function Field({ className = '', label, onChange, type = 'text', value }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <input className="mt-2 min-h-12 w-full rounded-2xl border-2 border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100" onChange={(event) => onChange(event.target.value)} type={type} value={value} />
    </label>
  )
}

function FileField({ label, onChange, value }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <input className="mt-2 min-h-12 w-full rounded-2xl border border-dashed border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-bold text-cyan-800 outline-none transition file:mr-4 file:rounded-xl file:border-0 file:bg-navy-950 file:px-3 file:py-2 file:text-sm file:font-bold file:text-white focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100" onChange={(event) => onChange(event.target.files?.[0]?.name || '')} type="file" />
      {value && <span className="mt-2 block text-xs font-bold text-cyan-700">Fichier sélectionné : {value}</span>}
    </label>
  )
}

function Select({ label, onChange, options, value }) {
  const normalizedOptions = options.map((option) =>
    typeof option === 'string' ? { label: option, value: option } : option,
  )

  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <select className="mt-2 min-h-12 w-full rounded-2xl border-2 border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100" onChange={(event) => onChange(event.target.value)} value={value}>
        {normalizedOptions.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  )
}

function ReadOnlyField({ label, value }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <input
        readOnly
        className="mt-2 min-h-12 w-full cursor-default rounded-2xl border-2 border-slate-300 bg-slate-50 px-4 text-sm font-medium text-slate-600 outline-none"
        type="text"
        value={value}
      />
    </label>
  )
}

function InlineNotice({ label }) {
  return <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-bold text-slate-500">{label}</p>
}

function formatDate(value) {
  // Une date absente ou mal saisie ne doit pas faire planter toute la page.
  const date = value ? new Date(`${value}T12:00:00`) : null
  if (!date || Number.isNaN(date.getTime())) return 'Non renseigné'
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}

function isElectric(vehicle) {
  return vehicle?.energy === 'électrique'
}

function isHybrid(vehicle) {
  return vehicle?.energy === 'hybride'
}

function isRechargeEntry(vehicle, fuelType) {
  return isElectric(vehicle) || fuelType === 'Recharge électrique'
}

function getDefaultChargeLevelAfter(vehicle, form = {}) {
  if (form.chargeLevelAfter !== '' && form.chargeLevelAfter != null) {
    return String(form.chargeLevelAfter)
  }
  const level = Number(vehicle?.batteryLevel ?? 0)
  // Batterie déjà pleine en fiche : curseur à 0 pour pouvoir glisser vers la droite.
  return level >= 100 ? '0' : String(level)
}

function getFuelTypeOptions(vehicle, operation = 'fuel') {
  if (!vehicle || operation === 'recharge') return []
  if (isHybrid(vehicle)) return ['SP95', 'SP98']
  const energy = (vehicle.energy || '').toLowerCase()
  if (energy === 'diesel') return ['Diesel']
  if (energy === 'essence') return ['SP95']
  return ['SP95']
}

function getDefaultFuelType(vehicle, operation = 'fuel') {
  if (operation === 'recharge') return 'Recharge électrique'
  return getFuelTypeOptions(vehicle, operation)[0] || 'SP95'
}

function alignFuelFormToVehicle(form, vehicle) {
  if (!vehicle) return form

  let fuelOperation = form.fuelOperation
  if (isHybrid(vehicle)) {
    fuelOperation = form.fuelType === 'Recharge électrique' || Number(form.kwh) > 0
      ? 'recharge'
      : (fuelOperation === 'recharge' ? 'recharge' : 'fuel')
  } else if (isElectric(vehicle)) {
    fuelOperation = 'recharge'
  } else {
    fuelOperation = 'fuel'
  }

  const fuelType = fuelOperation === 'recharge'
    ? 'Recharge électrique'
    : (getFuelTypeOptions(vehicle, 'fuel').includes(form.fuelType)
        ? form.fuelType
        : getDefaultFuelType(vehicle, 'fuel'))

  const chargeLevelAfter = fuelOperation === 'recharge'
    ? getDefaultChargeLevelAfter(vehicle, form)
    : ''

  return { ...form, fuelOperation, fuelType, chargeLevelAfter }
}
