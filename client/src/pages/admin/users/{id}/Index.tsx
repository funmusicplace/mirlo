import { useQuery } from "@tanstack/react-query";
import Button from "components/common/Button";
import { InputEl } from "components/common/Input";
import { SelectEl } from "components/common/Select";
import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import Table from "components/common/Table";
import { Toggle } from "components/common/Toggle";
import { formatDate as formatDateForLocale } from "components/TrackGroup/ReleaseDate";
import { queryTrustLevelNames } from "queries/settings";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaArrowCircleLeft, FaCheck, FaTimes, FaTrash } from "react-icons/fa";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";
import { getArtistUrl } from "utils/artist";
import { DEFAULT_TRUST_LEVEL_NAMES } from "utils/trustLevel";

const Index = () => {
  const { id } = useParams();
  const [user, setUser] = React.useState<UserFromAdmin>();
  const [stripeAccountId, setStripeAccountId] = React.useState<string>("");
  const [accountingEmail, setAccountingEmail] = React.useState<string>("");
  const [featureFlags, setFeatureFlags] = React.useState<string[]>([]);
  const snackbar = useSnackbar();
  const emailStatusCellRef = React.useRef<HTMLTableCellElement>(null);
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { data: trustLevelNames = DEFAULT_TRUST_LEVEL_NAMES } = useQuery(
    queryTrustLevelNames()
  );

  const callback = React.useCallback(async () => {
    const response = await api.get<UserFromAdmin>(`admin/users/${id}`);
    setUser(response.result);
    setStripeAccountId(response.result.stripeAccountId || "");
    setAccountingEmail(response.result.accountingEmail || "");
    setFeatureFlags(response.result.featureFlags);
  }, [id]);

  const onConfirmationEmailClick = React.useCallback(async () => {
    await api.post(`users/${id}/confirmEmail`, {});
    await callback();
    emailStatusCellRef.current?.focus();
  }, [callback, id]);

  const onResendConfirmationEmailClick = React.useCallback(async () => {
    if (!user) {
      return;
    }
    try {
      await api.post("resend-verification-email", {
        email: user.email,
        client: import.meta.env.VITE_CLIENT_DOMAIN,
      });
      snackbar(`Confirmation email sent to ${user.email}`, {
        type: "success",
      });
    } catch (e) {
      snackbar("Could not send the confirmation email", { type: "warning" });
    }
  }, [snackbar, user]);

  const onLoginAsUserClick = React.useCallback(async () => {
    if (
      window.confirm(
        `Are you sure you want to log in as ${user?.email}? This will replace your current session.`
      )
    ) {
      await api.post(`admin/users/${id}/loginAsUser`, {});
      window.location.href = "/";
    }
  }, [id, user?.email]);

  const onDeleteClick = React.useCallback(async () => {
    if (
      window.confirm(
        `Are you sure you want to delete user ${user?.email}? This action cannot be undone.`
      )
    ) {
      await api.delete(`admin/users/${id}`);
      snackbar(`User ${user?.email} deleted`, { type: "success" });
      navigate("/admin/content/users");
    }
  }, [id, user?.email]);

  React.useEffect(() => {
    callback();
  }, [callback]);

  const formatDate = (value?: string) => {
    if (!value) {
      return "-";
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return `${formatDateForLocale({ date: value, i18n })} (${value})`;
  };

  if (!user) {
    return null;
  }

  return (
    <>
      <div>
        <SpaceBetweenDiv>
          <div>
            <h2 className="flex items-center [&_a]:mr-[0.3rem]">
              <Link to="/admin/content/users">
                <FaArrowCircleLeft />
              </Link>
              User "{user.email}"
            </h2>
          </div>
          <div>
            <Button onClick={onLoginAsUserClick}>Log in as user</Button>
          </div>
        </SpaceBetweenDiv>
        <div>
          <Table>
            <tbody>
              <tr>
                <td>email</td>
                <td>{user.email}</td>
              </tr>
              <tr>
                <td>name</td>
                <td>{user.name}</td>
              </tr>
              <tr>
                <td>created at</td>
                <td>{formatDate(user.createdAt)}</td>
              </tr>
              <tr>
                <td>updated at</td>
                <td>{formatDate(user.updatedAt)}</td>
              </tr>
              <tr>
                <td>
                  <label htmlFor="input-trust-level">Trust level</label>
                </td>
                <td>
                  <SelectEl
                    id="input-trust-level"
                    value={user.trustLevel}
                    onChange={async (e) => {
                      await api.put(`admin/users/${id}`, {
                        trustLevel: Number(e.target.value),
                      });
                      callback();
                    }}
                  >
                    {trustLevelNames.map((name, level) => (
                      <option key={level} value={level}>
                        {name}
                      </option>
                    ))}
                  </SelectEl>
                </td>
              </tr>
              <tr>
                <td>artists</td>
                <td>
                  {user.artists.map((a) => (
                    <Link to={getArtistUrl(a)} key={a.id}>
                      {a.name}
                    </Link>
                  ))}
                </td>
              </tr>
              <tr>
                <td>is admin?</td>
                <td>
                  <Toggle
                    toggled={user.isAdmin}
                    label=""
                    onClick={async (checked) => {
                      await api.put(`admin/users/${id}`, {
                        isAdmin: checked,
                      });
                      callback();
                    }}
                  />
                </td>
              </tr>
              <tr>
                <td>Account disabled?</td>
                <td>
                  <div className="flex flex-col">
                    <Toggle
                      toggled={!!user.disabledAt}
                      label=""
                      onClick={async (checked) => {
                        await api.put(`admin/users/${id}`, {
                          disabled: checked,
                        });
                        callback();
                      }}
                    />
                    <small>
                      Disabling an account immediately blocks the user from
                      logging in, without deleting or anonymising their data. It
                      can be re-enabled at any time.
                    </small>
                  </div>
                </td>
              </tr>
              <tr>
                <td>Can create artists?</td>
                <td>
                  <div className="flex flex-col">
                    <Toggle
                      toggled={user.canCreateArtists}
                      label=""
                      onClick={async (checked) => {
                        await api.put(`admin/users/${id}`, {
                          canCreateArtists: checked,
                        });
                        callback();
                      }}
                    />
                    <small>
                      Disabling the ability to create artists for a user also
                      prevents them from creating releases, merch, etc and will
                      unlist their music from public view.
                    </small>
                  </div>
                </td>
              </tr>
              <tr>
                <td>currency</td>
                <td>{user.currency}</td>
              </tr>
              <tr>
                <td>email confirmed?</td>
                <td ref={emailStatusCellRef} tabIndex={-1}>
                  {user.hasPendingEmailConfirmation ? (
                    <div className="flex items-center gap-2">
                      <FaTimes />
                      <Button
                        variant="outlined"
                        size="compact"
                        onClick={onResendConfirmationEmailClick}
                      >
                        Resend confirmation email
                      </Button>
                      <Button
                        variant="outlined"
                        size="compact"
                        onClick={onConfirmationEmailClick}
                      >
                        Mark as confirmed
                      </Button>
                    </div>
                  ) : (
                    <FaCheck />
                  )}
                </td>
              </tr>
              <tr>
                <td>is label account?</td>
                <td>
                  <Toggle
                    toggled={user.isLabelAccount}
                    label=""
                    onClick={async (checked) => {
                      await api.put(`admin/users/${id}`, {
                        isLabelAccount: checked,
                      });
                      callback();
                    }}
                  />
                </td>
              </tr>

              <tr>
                <td>Feature flags</td>
                <td>
                  <div className="flex flex-col items-start gap-2">
                    <SelectEl
                      multiple
                      defaultValue={featureFlags}
                      onChange={(e) => {
                        const selectedOptions = Array.from(
                          e.target.selectedOptions,
                          (option) => option.value
                        );
                        setFeatureFlags(selectedOptions);
                      }}
                    >
                      {["activityPub", "federatedStreaming"].map((flag) => (
                        <option key={flag} value={flag}>
                          {flag}
                        </option>
                      ))}
                    </SelectEl>
                    <Button
                      onClick={async () => {
                        await api.put(`admin/users/${id}`, {
                          featureFlags: featureFlags,
                        });
                        callback();
                      }}
                    >
                      Save
                    </Button>
                  </div>
                </td>
              </tr>
              <tr>
                <td>
                  <label htmlFor="input-stripe-account-id">
                    Stripe account ID
                  </label>
                </td>
                <td className="flex gap-2">
                  <InputEl
                    id="input-stripe-account-id"
                    onChange={(event) => setStripeAccountId(event.target.value)}
                    type="text"
                    value={stripeAccountId}
                  />
                  <Button
                    onClick={async () => {
                      await api.put(`admin/users/${id}`, { stripeAccountId });
                      callback();
                    }}
                  >
                    Save
                  </Button>
                </td>
              </tr>
              <tr>
                <td>
                  <label htmlFor="input-transaction-email">
                    Transaction email
                  </label>
                </td>
                <td className="flex gap-2">
                  <InputEl
                    id="input-transaction-email"
                    onChange={(event) => setAccountingEmail(event.target.value)}
                    type="text"
                    value={accountingEmail}
                  />
                  <Button
                    onClick={async () => {
                      await api.put(`admin/users/${id}`, { accountingEmail });
                      callback();
                    }}
                  >
                    Save
                  </Button>
                </td>
              </tr>
              <tr>
                <td>receive mailing list</td>
                <td>{user.receiveMailingList ? <FaCheck /> : <FaTimes />}</td>
              </tr>
            </tbody>
          </Table>
          <section className="mt-8 flex flex-col items-start gap-2">
            <h3>Delete user</h3>
            <small>
              This permanently deletes the user, their artists and everything
              attached to them. It cannot be undone.
            </small>
            <Button
              buttonRole="warning"
              startIcon={<FaTrash />}
              onClick={onDeleteClick}
            >
              Delete user
            </Button>
          </section>
        </div>
      </div>
    </>
  );
};

export default Index;
