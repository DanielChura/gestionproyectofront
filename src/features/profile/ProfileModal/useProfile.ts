import { useCallback, useEffect, useState } from "react";
import { getSessionProfile } from "../../auth/api";
import type { SessionProfile } from "../../auth/api";
import { listSpecialties } from "../../../core/services/organizationService";
import {
  addMySpecialty,
  listMySpecialties,
  removeMySpecialty,
} from "../../../core/services/workerService";
import type { MySpecialty } from "../../../core/interfaces/worker.interface";
import type { Specialty } from "../../../core/interfaces/organization.interface";

export const useProfile = () => {
  const [profile, setProfile] = useState<SessionProfile | null>(null);
  const [specialties, setSpecialties] = useState<MySpecialty[]>([]);
  const [catalog, setCatalog] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const [session, mine, all] = await Promise.all([
        getSessionProfile(),
        listMySpecialties(),
        listSpecialties(),
      ]);
      setProfile(session);
      setSpecialties(mine);
      setCatalog(all);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("Unknown error"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(fetch);
  }, [fetch]);

  const addSpecialty = async (specialtyId: number) => {
    setSaving(true);
    try {
      await addMySpecialty({ specialty_id: specialtyId });
      await fetch();
    } finally {
      setSaving(false);
    }
  };

  const dropSpecialty = async (specialty: MySpecialty) => {
    setSaving(true);
    try {
      await removeMySpecialty(specialty.id);
      await fetch();
    } finally {
      setSaving(false);
    }
  };

  return {
    profile,
    specialties,
    catalog: catalog.filter(
      (item) => !specialties.some((mine) => mine.id === item.id),
    ),
    loading,
    error,
    saving,
    addSpecialty,
    dropSpecialty,
    reload: fetch,
  };
};
