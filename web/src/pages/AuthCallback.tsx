import { authServiceClient } from '@/grpcweb';
import { absolutifyLink } from '@/helpers/utils';
import useNavigateTo from '@/hooks/useNavigateTo';
import { useUserStore } from '@/store/v1';
import { last } from 'lodash-es';
import { LoaderIcon } from 'lucide-react';
import type { ClientError } from 'nice-grpc-web';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

interface State {
  loading: boolean;
  errorMessage: string;
}

const AuthCallback = () => {
  const navigateTo = useNavigateTo();
  const [searchParams] = useSearchParams();
  const userStore = useUserStore();
  const [state, setState] = useState<State>({
    loading: true,
    errorMessage: '',
  });

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
      setState({
        loading: false,
        errorMessage:
          'Failed to authorize. Invalid state passed to the auth callback.',
      });
      return;
    }

    const identityProviderId = Number(last(state.split('-')));
    if (!identityProviderId) {
      setState({
        loading: false,
        errorMessage: 'No identity provider ID found in the state parameter.',
      });
      return;
    }

    const redirectUri = absolutifyLink('/auth/callback');
    (async () => {
      try {
        await authServiceClient.signInWithSSO({
          idpId: identityProviderId,
          code,
          redirectUri,
        });
        setState({
          loading: false,
          errorMessage: '',
        });
        await userStore.fetchCurrentUser();
        navigateTo('/');
      } catch (error: any) {
        setState({
          loading: false,
          errorMessage: (error as ClientError).details,
        });
      }
    })();
  }, [searchParams]);

  return (
    <div className="flex h-full w-full items-center justify-center p-4 py-24">
      {state.loading ? (
        <LoaderIcon className="animate-spin dark:text-gray-200" />
      ) : (
        <div className="max-w-lg whitespace-pre-wrap font-mono opacity-80">
          {state.errorMessage}
        </div>
      )}
    </div>
  );
};

export default AuthCallback;
