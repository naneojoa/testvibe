import { useState, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Field, PageTitle } from '../components/ui';
import { getMe, login, signUp, type Credentials, type SignUpValues } from '../features/auth/api';
import { errorMessage, toFieldErrors } from '../lib/format';
import { clearFieldError, validateCredentials, validateNickname } from '../lib/validation';
import { useAuthStore, useUiStore } from '../stores/ui-store';

export function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const showToast = useUiStore((state) => state.showToast);
  const [values, setValues] = useState<Credentials>({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const redirect = safeRedirect(params.get('redirect'));
  const mutation = useMutation({
    mutationFn: async () => {
      await login({ email: values.email.trim(), password: values.password });
      return getMe();
    },
    onSuccess: (me) => {
      queryClient.setQueryData(['me'], me);
      setUser(me);
      showToast('로그인했습니다.');
      navigate(redirect, { replace: true });
    },
    onError: (error) => {
      setErrors(toFieldErrors(error));
      showToast(errorMessage(error), 'error');
    },
  });
  if (user) return <Navigate to={redirect} replace />;
  const submit = () => {
    const nextErrors = validateCredentials(values.email, values.password);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) mutation.mutate();
  };
  return (
    <AuthForm
      title="다시 만나서 반가워요"
      lead="글을 작성하고, 댓글과 좋아요로 대화에 참여하세요."
      values={values}
      errors={errors}
      onChange={(key, value) => {
        setValues({ ...values, [key]: value });
        setErrors((current) => clearFieldError(current, key));
      }}
      onSubmit={submit}
      pending={mutation.isPending}
      submitLabel="로그인"
    >
      <p className="form-footnote">
        처음이신가요? <Link to="/sign-up">회원가입</Link>
      </p>
    </AuthForm>
  );
}

export function SignUpPage() {
  const navigate = useNavigate();
  const showToast = useUiStore((state) => state.showToast);
  const [values, setValues] = useState<SignUpValues>({ email: '', password: '', nickname: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const mutation = useMutation({
    mutationFn: () =>
      signUp({
        email: values.email.trim(),
        password: values.password,
        nickname: values.nickname.trim(),
      }),
    onSuccess: () => {
      showToast('회원가입이 완료되었습니다. 로그인해 주세요.');
      navigate('/login');
    },
    onError: (error) => {
      setErrors(toFieldErrors(error));
      showToast(errorMessage(error), 'error');
    },
  });
  const submit = () => {
    const nextErrors = {
      ...validateCredentials(values.email, values.password),
      ...validateNickname(values.nickname),
    };
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) mutation.mutate();
  };
  return (
    <AuthForm
      title="잇글에 가입하기"
      lead="필요한 정보만 입력하고 바로 이야기를 시작하세요."
      values={values}
      errors={errors}
      onChange={(key, value) => {
        setValues({ ...values, [key]: value });
        setErrors((current) => clearFieldError(current, key));
      }}
      onSubmit={submit}
      pending={mutation.isPending}
      submitLabel="회원가입"
    >
      <p className="form-footnote">
        이미 계정이 있으신가요? <Link to="/login">로그인</Link>
      </p>
    </AuthForm>
  );
}

function AuthForm({
  title,
  lead,
  values,
  errors,
  onChange,
  onSubmit,
  pending,
  submitLabel,
  children,
}: {
  title: string;
  lead: string;
  values: Credentials | SignUpValues;
  errors: Record<string, string>;
  onChange: (key: keyof SignUpValues, value: string) => void;
  onSubmit: () => void;
  pending: boolean;
  submitLabel: string;
  children: ReactNode;
}) {
  const isSignUp = 'nickname' in values;
  return (
    <>
      <PageTitle eyebrow="AUTH" title={title}>
        {lead}
      </PageTitle>
      <form
        className="form-card auth-card"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <Field label="이메일" error={errors.email}>
          <input
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(event) => onChange('email', event.target.value)}
          />
        </Field>
        <Field label="비밀번호" error={errors.password} hint="8~72자">
          <input
            type="password"
            autoComplete={submitLabel === '로그인' ? 'current-password' : 'new-password'}
            value={values.password}
            onChange={(event) => onChange('password', event.target.value)}
          />
        </Field>
        {isSignUp ? (
          <Field label="닉네임" error={errors.nickname} hint="2~50자">
            <input
              autoComplete="nickname"
              value={values.nickname}
              onChange={(event) => onChange('nickname', event.target.value)}
            />
          </Field>
        ) : null}
        <button type="submit" disabled={pending}>
          {pending ? '처리 중…' : submitLabel}
        </button>
        {children}
      </form>
    </>
  );
}

function safeRedirect(value: string | null) {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/';
}
