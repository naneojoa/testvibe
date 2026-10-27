import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Field, PageTitle } from '../components/ui';
import { updateProfile } from '../features/users/api';
import { errorMessage, toFieldErrors } from '../lib/format';
import { clearFieldError, validateNickname } from '../lib/validation';
import { useAuthStore, useUiStore } from '../stores/ui-store';

export function MePage() {
  const user = useAuthStore((state) => state.user)!;
  const setUser = useAuthStore((state) => state.setUser);
  const showToast = useUiStore((state) => state.showToast);
  const queryClient = useQueryClient();
  const [nickname, setNickname] = useState(user.nickname);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const mutation = useMutation({
    mutationFn: () => updateProfile(nickname.trim()),
    onSuccess: (nextUser) => {
      setUser(nextUser);
      queryClient.setQueryData(['me'], nextUser);
      showToast('내 정보를 수정했습니다.');
    },
    onError: (error) => {
      setErrors(toFieldErrors(error));
      showToast(errorMessage(error), 'error');
    },
  });
  return (
    <>
      <PageTitle eyebrow="MY PROFILE" title="내 정보">
        프로필에 표시되는 닉네임을 관리합니다.
      </PageTitle>
      <form
        className="form-card"
        onSubmit={(event) => {
          event.preventDefault();
          const nextErrors = validateNickname(nickname);
          setErrors(nextErrors);
          if (Object.keys(nextErrors).length === 0) mutation.mutate();
        }}
      >
        <Field label="이메일">
          <input value={user.email} readOnly />
        </Field>
        <Field label="닉네임" error={errors.nickname} hint="2~50자">
          <input
            value={nickname}
            maxLength={50}
            onChange={(event) => {
              setNickname(event.target.value);
              setErrors((current) => clearFieldError(current, 'nickname'));
            }}
          />
        </Field>
        <Field label="권한">
          <input value={user.role} readOnly />
        </Field>
        <div className="form-actions">
          <button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? '저장 중…' : '변경 저장'}
          </button>
        </div>
      </form>
    </>
  );
}
