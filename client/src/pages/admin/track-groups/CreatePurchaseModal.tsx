import Button from "components/common/Button";
import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import Modal from "components/common/Modal";
import { SelectEl } from "components/common/Select";
import TextArea from "components/common/TextArea";
import React from "react";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";
import parseEmailList from "utils/parseEmailList";

const paymentStatuses = ["COMPLETED", "PENDING", "FAILED"] as const;

const CreatePurchaseModal: React.FC<{
  trackGroup: TrackGroup | null;
  onClose: () => void;
}> = ({ trackGroup, onClose }) => {
  const snackbar = useSnackbar();
  const [emails, setEmails] = React.useState("");
  const [withTransaction, setWithTransaction] = React.useState(false);
  const [amount, setAmount] = React.useState("");
  const [currency, setCurrency] = React.useState("usd");
  const [paymentStatus, setPaymentStatus] =
    React.useState<(typeof paymentStatuses)[number]>("COMPLETED");
  const [stripeId, setStripeId] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);

  const reset = () => {
    setEmails("");
    setWithTransaction(false);
    setAmount("");
    setCurrency("usd");
    setPaymentStatus("COMPLETED");
    setStripeId("");
  };

  const onSubmit = async () => {
    if (!trackGroup) {
      return;
    }
    const users = parseEmailList(emails);

    if (users.length === 0) {
      snackbar("Add at least one user email", { type: "warning" });
      return;
    }

    if (withTransaction && (amount === "" || isNaN(Number(amount)))) {
      snackbar("A transaction needs an amount in cents", { type: "warning" });
      return;
    }

    setIsSaving(true);
    try {
      const { notFoundEmails } = await api.post<
        unknown,
        { results: unknown[]; notFoundEmails: string[] }
      >(`admin/purchases`, {
        users,
        trackGroupId: trackGroup.id,
        transaction: withTransaction
          ? {
              amount: Math.round(Number(amount)),
              currency,
              paymentStatus,
              stripeId: stripeId.trim() || undefined,
            }
          : undefined,
      });
      if (notFoundEmails.length > 0) {
        snackbar(
          `Purchases created, but no account exists for: ${notFoundEmails.join(", ")}`,
          { type: "warning" }
        );
      } else {
        snackbar("Purchases created", { type: "success" });
      }
      reset();
      onClose();
    } catch (e) {
      snackbar("Something went wrong creating the purchases", {
        type: "warning",
      });
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      open={!!trackGroup}
      onClose={onClose}
      size="small"
      title={`Add purchase: ${trackGroup?.title ?? ""}`}
    >
      <FormComponent>
        <label>User emails (comma or newline separated)</label>
        <TextArea
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
          rows={4}
        />
      </FormComponent>
      <FormComponent direction="row">
        <input
          id="withTransaction"
          type="checkbox"
          checked={withTransaction}
          onChange={(e) => setWithTransaction(e.target.checked)}
        />
        <label htmlFor="withTransaction">
          Also create a transaction for each purchase
        </label>
      </FormComponent>
      {withTransaction && (
        <>
          <FormComponent>
            <label>Amount in cents</label>
            <InputEl
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </FormComponent>
          <FormComponent>
            <label>Currency</label>
            <InputEl
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toLowerCase())}
            />
          </FormComponent>
          <FormComponent>
            <label>Stripe ID (optional)</label>
            <InputEl
              value={stripeId}
              onChange={(e) => setStripeId(e.target.value)}
              placeholder="e.g. a checkout session or payment intent id"
            />
          </FormComponent>
          <FormComponent>
            <label>Payment status</label>
            <SelectEl
              value={paymentStatus}
              onChange={(e) =>
                setPaymentStatus(
                  e.target.value as (typeof paymentStatuses)[number]
                )
              }
            >
              {paymentStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </SelectEl>
          </FormComponent>
        </>
      )}
      <Button onClick={onSubmit} isLoading={isSaving} disabled={isSaving}>
        Create purchases
      </Button>
    </Modal>
  );
};

export default CreatePurchaseModal;
