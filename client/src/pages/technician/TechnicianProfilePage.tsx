import { LoaderCircle, LocateFixed } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Alert } from '../../components/Alert';
import { Button } from '../../components/Button';
import { DayPicker } from '../../components/profile/DayPicker';
import { LocationPicker } from '../../components/profile/LocationPicker';
import { NidUpload } from '../../components/profile/NidUpload';
import { ServicePicker } from '../../components/profile/ServicePicker';
import { StatusBanner } from '../../components/profile/StatusBanner';
import { StepCard } from '../../components/profile/StepCard';
import { api } from '../../lib/api';
import { formErrorsFrom, noErrors, type FormErrors } from '../../lib/form-errors';
import { DHAKA_CENTER, isInsideDhaka, nearestArea } from '../../lib/geo';
import { formatTime, timeOptions } from '../../lib/time';
import { useDocumentTitle } from '../../lib/use-document-title';
import type {
  Area,
  LatLng,
  ProfileForm,
  Radius,
  Service,
  TechnicianProfile,
} from './profile-types';

function toggle<T>(list: T[], value: T) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

const emptyForm: ProfileForm = {
  serviceIds: [],
  skillIds: [],
  areaName: '',
  location: null,
  serviceRadiusKm: 10,
  workingDays: [6, 0, 1, 2, 3, 4],
  start: '09:00',
  end: '20:00',
  experienceYears: '',
};

function formFrom(profile: TechnicianProfile): ProfileForm {
  return {
    serviceIds: profile.serviceIds,
    skillIds: profile.skillIds,
    areaName: profile.areaName,
    location: { lat: profile.location.coordinates[1], lng: profile.location.coordinates[0] },
    serviceRadiusKm: ([5, 10, 15].includes(profile.serviceRadiusKm)
      ? profile.serviceRadiusKm
      : 10) as Radius,
    workingDays: profile.workingDays,
    start: profile.workingHours.start,
    end: profile.workingHours.end,
    experienceYears: String(profile.experienceYears),
  };
}

const selectClass =
  'h-12 w-full rounded-box border-[1.5px] border-line bg-white px-3 text-base text-tea focus:border-tea focus:outline-none';

export default function TechnicianProfilePage() {
  useDocumentTitle('My profile');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [profile, setProfile] = useState<TechnicianProfile | null>(null);
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [nidFile, setNidFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<FormErrors>(noErrors);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [locationNote, setLocationNote] = useState('');
  const [toggling, setToggling] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let stillHere = true;
    Promise.all([
      api<{ services: Service[] }>('/services'),
      api<{ areas: Area[] }>('/areas'),
      api<{ profile: TechnicianProfile | null }>('/technicians/me/profile'),
    ])
      .then(([catalog, areaList, mine]) => {
        if (!stillHere) return;
        setServices(catalog.services);
        setAreas(areaList.areas);
        setProfile(mine.profile);
        if (mine.profile) setForm(formFrom(mine.profile));
        setLoadError('');
      })
      .catch((error: unknown) => {
        if (stillHere) setLoadError(formErrorsFrom(error).message || "Couldn't load your profile.");
      })
      .finally(() => {
        if (stillHere) setLoading(false);
      });
    return () => {
      stillHere = false;
    };
  }, [attempt]);

  const change = (update: Partial<ProfileForm>) => {
    setForm((current) => ({ ...current, ...update }));
    setNotice('');
  };

  function toggleService(serviceId: string) {
    if (form.serviceIds.includes(serviceId)) {
      const removedSkills = services.find((s) => s.id === serviceId)?.skills.map((k) => k.id) ?? [];
      change({
        serviceIds: form.serviceIds.filter((id) => id !== serviceId),
        skillIds: form.skillIds.filter((id) => !removedSkills.includes(id)),
      });
    } else {
      change({ serviceIds: [...form.serviceIds, serviceId] });
    }
  }

  function chooseArea(name: string) {
    const area = areas.find((a) => a.name === name);
    change({ areaName: name, location: area ? { lat: area.lat, lng: area.lng } : form.location });
  }

  function useMyLocation() {
    if (!('geolocation' in navigator)) {
      setLocationNote("Your browser can't share your location. Drag the pin instead.");
      return;
    }
    setLocationNote('Finding you…');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const point: LatLng = { lat: coords.latitude, lng: coords.longitude };
        if (!isInsideDhaka(point)) {
          setLocationNote('You seem to be outside Dhaka. Pick your area and drag the pin instead.');
          return;
        }
        change({ location: point, areaName: nearestArea(point, areas)?.name ?? form.areaName });
        setLocationNote('Found you. Drag the pin if it is not quite right.');
      },
      () => setLocationNote("We couldn't get your location. Drag the pin instead."),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  async function toggleJobs(acceptingJobs: boolean) {
    setToggling(true);
    try {
      const data = await api<{ profile: TechnicianProfile }>('/technicians/me/availability', {
        method: 'PATCH',
        body: { acceptingJobs },
      });
      setProfile(data.profile);
    } catch (error) {
      setErrors(formErrorsFrom(error));
    } finally {
      setToggling(false);
    }
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setErrors(noErrors);
    setNotice('');
    setSaving(true);
    try {
      const saved = await api<{ profile: TechnicianProfile }>('/technicians/me/profile', {
        method: 'PUT',
        body: {
          serviceIds: form.serviceIds,
          skillIds: form.skillIds,
          areaName: form.areaName,
          location: form.location ?? undefined,
          serviceRadiusKm: form.serviceRadiusKm,
          workingDays: form.workingDays,
          workingHours: { start: form.start, end: form.end },
          experienceYears: form.experienceYears === '' ? undefined : Number(form.experienceYears),
        },
      });
      setProfile(saved.profile);

      if (nidFile) {
        const photo = new FormData();
        photo.append('photo', nidFile);
        try {
          const uploaded = await api<{ profile: TechnicianProfile }>('/technicians/me/nid', {
            method: 'POST',
            body: photo,
          });
          setProfile(uploaded.profile);
          setNidFile(null);
        } catch (error) {
          setErrors({
            fields: { nid: formErrorsFrom(error).message },
            message: "Your details are saved, but the NID photo didn't upload.",
          });
          return;
        }
      }
      setNotice('Profile saved.');
    } catch (error) {
      const found = formErrorsFrom(error);
      setErrors(
        Object.keys(found.fields).length > 0
          ? { ...found, message: 'Some details need fixing. Check the red messages above.' }
          : found,
      );
    } finally {
      setSaving(false);
    }
  }

  const errorFor = (...fields: string[]) =>
    Object.entries(errors.fields).find(([key]) =>
      fields.some((field) => key === field || key.startsWith(`${field}.`)),
    )?.[1];

  if (loading) {
    return (
      <div className="grid place-items-center py-20 text-muted">
        <LoaderCircle className="animate-spin" aria-label="Loading your profile" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="grid max-w-md gap-4">
        <Alert>{loadError}</Alert>
        <Button
          variant="secondary"
          onClick={() => {
            setLoading(true);
            setAttempt((n) => n + 1);
          }}
        >
          Try again
        </Button>
      </div>
    );
  }

  const step1Done =
    form.serviceIds.length > 0 &&
    form.serviceIds.every((id) =>
      services.find((s) => s.id === id)?.skills.some((k) => form.skillIds.includes(k.id)),
    );
  const step2Done = form.areaName !== '' && form.location !== null;
  const step3Done =
    form.workingDays.length > 0 && form.start < form.end && form.experienceYears !== '';
  const step4Done = Boolean(profile?.hasNidPhoto || nidFile);

  return (
    <form onSubmit={handleSave} noValidate className="mx-auto grid max-w-3xl gap-5 pb-28">
      <div className="grid gap-1">
        <h1 className="text-4xl font-extrabold">My profile</h1>
        <p className="text-muted">
          Customers see your services, area and experience. Your NID photo stays private.
        </p>
      </div>

      <StatusBanner profile={profile} onToggleJobs={toggleJobs} toggling={toggling} />

      <StepCard
        step={1}
        title="What do you do?"
        description="Choose up to 3 services, then the jobs you're good at."
        done={step1Done}
        error={errorFor('serviceIds', 'skillIds')}
      >
        <ServicePicker
          services={services}
          serviceIds={form.serviceIds}
          skillIds={form.skillIds}
          onToggleService={toggleService}
          onToggleSkill={(id) => change({ skillIds: toggle(form.skillIds, id) })}
        />
      </StepCard>

      <StepCard
        step={2}
        title="Where do you work?"
        description="Pick your area, then drag the pin to where you usually start from."
        done={step2Done}
        error={errorFor('areaName', 'location', 'serviceRadiusKm')}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-semibold">
            Area
            <select
              className={selectClass}
              value={form.areaName}
              onChange={(e) => chooseArea(e.target.value)}
            >
              <option value="" disabled>
                Choose your area
              </option>
              {areas.map((area) => (
                <option key={area.name} value={area.name}>
                  {area.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">
            How far will you travel?
            <select
              className={selectClass}
              value={form.serviceRadiusKm}
              onChange={(e) => change({ serviceRadiusKm: Number(e.target.value) as Radius })}
            >
              {[5, 10, 15].map((km) => (
                <option key={km} value={km}>
                  Up to {km} km
                </option>
              ))}
            </select>
          </label>
        </div>
        <LocationPicker
          value={form.location}
          center={form.location ?? DHAKA_CENTER}
          radiusKm={form.serviceRadiusKm}
          onChange={(point) => change({ location: point })}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted" role="status">
            {locationNote || 'Customers never see your exact pin, only your area.'}
          </p>
          <button
            type="button"
            onClick={useMyLocation}
            className="inline-flex h-10 items-center gap-2 rounded-box border-[1.5px] border-line px-3 font-semibold hover:border-tea"
          >
            <LocateFixed size={18} aria-hidden="true" />
            Use my current location
          </button>
        </div>
      </StepCard>

      <StepCard
        step={3}
        title="When do you work?"
        description="Customers can only book you on these days and hours."
        done={step3Done}
        error={errorFor('workingDays', 'workingHours', 'experienceYears')}
      >
        <DayPicker
          selected={form.workingDays}
          onToggle={(day) => change({ workingDays: toggle(form.workingDays, day) })}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-semibold">
            From
            <select
              className={selectClass}
              value={form.start}
              onChange={(e) => change({ start: e.target.value })}
            >
              {timeOptions.map((time) => (
                <option key={time} value={time}>
                  {formatTime(time)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">
            To
            <select
              className={selectClass}
              value={form.end}
              onChange={(e) => change({ end: e.target.value })}
            >
              {timeOptions.map((time) => (
                <option key={time} value={time}>
                  {formatTime(time)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="grid max-w-60 gap-1.5 text-sm font-semibold">
          Years of experience
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={60}
            className={selectClass}
            value={form.experienceYears}
            onChange={(e) => change({ experienceYears: e.target.value })}
          />
        </label>
      </StepCard>

      <StepCard
        step={4}
        title="Your NID photo"
        description="A clear photo of the front of your National ID card."
        done={step4Done}
        error={errors.fields.nid}
      >
        <NidUpload
          hasNidPhoto={Boolean(profile?.hasNidPhoto)}
          file={nidFile}
          onFileChange={(file) => {
            setNidFile(file);
            setNotice('');
          }}
        />
      </StepCard>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-white px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <p
            role="status"
            className={`hidden flex-1 text-sm sm:block ${errors.message ? 'font-medium text-alert' : 'text-muted'}`}
          >
            {errors.message || notice || 'Save after changing anything.'}
          </p>
          <Button type="submit" loading={saving} className="w-full sm:w-auto">
            {saving ? 'Saving…' : 'Save profile'}
          </Button>
        </div>
        {(errors.message || notice) && (
          <p
            className={`mx-auto mt-2 max-w-3xl text-sm sm:hidden ${errors.message ? 'text-alert' : 'text-pond'}`}
          >
            {errors.message || notice}
          </p>
        )}
      </div>
    </form>
  );
}
