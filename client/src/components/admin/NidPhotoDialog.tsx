import { Check, LoaderCircle, Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { formErrorsFrom } from '../../lib/form-errors';
import type { AdminTechnician } from '../../pages/admin/admin-types';
import { Alert } from '../Alert';
import { Button } from '../Button';
import { Modal } from '../Modal';

interface NidPhotoDialogProps {
  technician: AdminTechnician;
  serviceNames: string;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}

export function NidPhotoDialog({
  technician,
  serviceNames,
  onClose,
  onApprove,
  onReject,
}: NidPhotoDialogProps) {
  const [url, setUrl] = useState('');
  const [problem, setProblem] = useState('');
  const [expired, setExpired] = useState(false);
  const firstName = technician.user.name.split(' ')[0];

  useEffect(() => {
    let stillOpen = true;
    api<{ url: string }>(`/admin/technicians/${technician.userId}/nid`)
      .then((data) => stillOpen && setUrl(data.url))
      .catch((error: unknown) => stillOpen && setProblem(formErrorsFrom(error).message));
    return () => {
      stillOpen = false;
    };
  }, [technician.userId]);

  return (
    <Modal
      title={`${technician.user.name}'s NID`}
      subtitle={`${technician.user.phone} · ${serviceNames} · ${technician.areaName}`}
      onClose={onClose}
    >
      <div className="grid min-h-48 place-items-center overflow-hidden rounded-box border border-line bg-paper">
        {problem && <Alert>{problem}</Alert>}
        {!problem && !url && (
          <LoaderCircle className="animate-spin text-muted" aria-label="Opening the photo" />
        )}
        {url && !expired && (
          <img
            src={url}
            alt={`NID photo of ${technician.user.name}`}
            className="max-h-[55vh] w-full object-contain"
            onError={() => setExpired(true)}
          />
        )}
        {expired && (
          <p className="p-6 text-center text-muted">
            The photo stopped showing. Close this and open it again.
          </p>
        )}
      </div>

      <div className="rounded-box bg-paper px-3 py-2.5">
        <strong className="block">Check before approving</strong>
        The name on the NID is <strong>{technician.user.name}</strong>, and the photo looks clear.
      </div>

      <p className="flex items-start gap-2 text-sm text-muted">
        <Lock size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        For privacy, this photo opens for 5 minutes only. If it stops showing, close this and open
        it again.
      </p>

      <div className="flex flex-wrap justify-end gap-2.5">
        <Button variant="secondary" onClick={onReject}>
          Reject
        </Button>
        <Button onClick={onApprove}>
          <Check size={18} aria-hidden="true" />
          Approve {firstName}
        </Button>
      </div>
    </Modal>
  );
}
