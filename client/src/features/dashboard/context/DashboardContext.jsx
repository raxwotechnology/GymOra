import React from "react";
import { getDashboard } from "../api/dashboardApi";
import {
  createGym, getGymDetails, reactivateGym, resetOwnerPassword, suspendGym, updateGym, uploadGymLogo,
  listGymOwners, addGymOwner, removeGymOwner,
  createSubscriptionPlan, updateSubscriptionPlan, deleteSubscriptionPlan, assignGymSubscription,
  recordGymPayment,
  extendGymTrial, sendTrialReminder,
  createBankDetail, updateBankDetail, deleteBankDetail,
  listCheques, createCheque, updateCheque, deleteCheque,
  createPlatformExpense, updatePlatformExpense, deletePlatformExpense,
  downloadGymsExcel, backupGymData, backupPlatformData
} from "../../gyms/api/adminApi";
import { updateMyProfile, updateMyWorkoutProgress } from "../../profile/api/profileApi";
import {
  createAnnouncement,
  approveMemberRequest,
  createCoach,
  createEquipment,
  createMealPlan,
  createMember,
  createAttendanceCheckIn,
  clockOutAttendance,
  startMemberBreak,
  endMemberBreak,
  importAttendanceExcel,
  createMembershipPlan,
  createWorkoutPlan,
  assignWorkoutPlanToMember,
  removeWorkoutPlanFromMember,
  sendMessage,
  markMessagesRead,
  assignMealPlanToMember,
  removeMealPlanFromMember,
  createExpense,
  deleteAnnouncement,
  deleteCoach,
  deleteMember,
  resetCoachPassword,
  resetMemberPassword,
  deleteMealPlan,
  deleteWorkoutPlan,
  rejectMemberRequest,
  createSale,
  createSaleReturn,
  createSupplement,
  updateAnnouncement,
  updateCoach,
  updateEquipment,
  updateExpense,
  updateMealPlan,
  updateMember,
  updateMemberSubscription,
  updateMembershipPlan,
  updateSupplement,
  updateWorkoutPlan,
  serviceEquipment,
  clockInCoachAttendance,
  clockOutCoachAttendance,
  startCoachBreak,
  endCoachBreak,
  createSalaryAdvance,
  updateSalaryAdvance,
  deleteSalaryAdvance,
  listSalaryAdvances,
  getMyPayroll,
  listPayroll,
  generatePayroll,
  updatePayrollRecord,
  approvePayrollRecord,
  markPayrollPaid,
  deletePayrollRecord
} from "../../owner/api/ownerApi";
import { useAuth } from "../../auth/context/AuthContext";
import { getSocket } from "../../../lib/socketClient";

const DashboardContext = React.createContext(null);

export function DashboardProvider({ children }) {
  const { user, syncUser } = useAuth();
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const refresh = React.useCallback(async () => {
    if (!user) {
      setData(null);
      setError("");
      return null;
    }

    if (!user.id) {
      setData(null);
      setError("Please sign in again.");
      return null;
    }

    setLoading(true);
    setError("");

    try {
      const nextData = await getDashboard();
      setData(nextData);
      return nextData;
    } catch (err) {
      const message = err.message || "Failed to load dashboard data";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  // Append incoming messages from socket without triggering a full refresh
  React.useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    function handleNewMessage(message) {
      setData((prev) => {
        if (!prev) return prev;
        const messages = Array.isArray(prev.messages) ? [...prev.messages, message] : [message];
        return { ...prev, messages };
      });
    }

    socket.on("new-message", handleNewMessage);
    return () => socket.off("new-message", handleNewMessage);
  }, []);

  const runMutation = React.useCallback(
    async (task) => {
      const result = await task();
      await refresh();
      return result;
    },
    [refresh]
  );

  const actions = React.useMemo(
    () => ({
      refresh,
      addGym: (payload) => runMutation(() => createGym(payload)),
      editGym: (id, payload) => runMutation(() => updateGym(id, payload)),
      uploadGymLogo: (id, file) => runMutation(() => uploadGymLogo(id, file)),
      suspendGym: (id) => runMutation(() => suspendGym(id)),
      reactivateGym: (id) => runMutation(() => reactivateGym(id)),
      getGymDetails: (id) => getGymDetails(id),
      resetOwnerPassword: (id) => resetOwnerPassword(id),
      listGymOwners: (gymId) => listGymOwners(gymId),
      addGymOwner: (gymId, payload) => runMutation(() => addGymOwner(gymId, payload)),
      removeGymOwner: (gymId, userId) => runMutation(() => removeGymOwner(gymId, userId)),
      addSubscriptionPlan: (payload) => runMutation(() => createSubscriptionPlan(payload)),
      editSubscriptionPlan: (planId, payload) => runMutation(() => updateSubscriptionPlan(planId, payload)),
      removeSubscriptionPlan: (planId) => runMutation(() => deleteSubscriptionPlan(planId)),
      assignGymSubscription: (gymId, payload) => runMutation(() => assignGymSubscription(gymId, payload)),
      recordGymPayment: (gymId, payload) => runMutation(() => recordGymPayment(gymId, payload)),
      extendGymTrial: (gymId, payload) => runMutation(() => extendGymTrial(gymId, payload)),
      sendTrialReminder: (gymId) => sendTrialReminder(gymId),
      addBankDetail: (payload) => runMutation(() => createBankDetail(payload)),
      editBankDetail: (id, payload) => runMutation(() => updateBankDetail(id, payload)),
      removeBankDetail: (id) => runMutation(() => deleteBankDetail(id)),
      listCheques: (gymId) => listCheques(gymId),
      addCheque: (payload) => runMutation(() => createCheque(payload)),
      editCheque: (id, payload) => runMutation(() => updateCheque(id, payload)),
      removeCheque: (id) => runMutation(() => deleteCheque(id)),
      addPlatformExpense: (payload) => runMutation(() => createPlatformExpense(payload)),
      editPlatformExpense: (id, payload) => runMutation(() => updatePlatformExpense(id, payload)),
      removePlatformExpense: (id) => runMutation(() => deletePlatformExpense(id)),
      downloadGymsExcel: () => downloadGymsExcel(),
      backupGymData: (id, name) => backupGymData(id, name),
      backupPlatformData: () => backupPlatformData(),
      addCoach: (payload) => runMutation(() => createCoach(payload)),
      editCoach: (id, payload) => runMutation(() => updateCoach(id, payload)),
      removeCoach: (id) => runMutation(() => deleteCoach(id)),
      resetCoachPassword: (id) => resetCoachPassword(id),
      addMember: (payload) => runMutation(() => createMember(payload)),
      editMember: (id, payload) => runMutation(() => updateMember(id, payload)),
      editMemberSubscription: (id, payload) => runMutation(() => updateMemberSubscription(id, payload)),
      approveMemberRequest: (id) => runMutation(() => approveMemberRequest(id)),
      rejectMemberRequest: (id) => runMutation(() => rejectMemberRequest(id)),
      removeMember: (id) => runMutation(() => deleteMember(id)),
      resetMemberPassword: (id) => resetMemberPassword(id),
      checkInMember: (payload) => runMutation(() => createAttendanceCheckIn(payload)),
      clockOutMember: (id) => runMutation(() => clockOutAttendance(id)),
      memberStartBreak: (id) => runMutation(() => startMemberBreak(id)),
      memberEndBreak: (id) => runMutation(() => endMemberBreak(id)),
      importAttendanceFile: (gymId, file) => runMutation(() => importAttendanceExcel(gymId, file)),
      markEquipmentServiced: (id) => runMutation(() => serviceEquipment(id)),
      addEquipment: (payload) => runMutation(() => createEquipment(payload)),
      editEquipment: (id, payload) => runMutation(() => updateEquipment(id, payload)),
      addMembershipPlan: (payload) => runMutation(() => createMembershipPlan(payload)),
      editMembershipPlan: (id, payload) => runMutation(() => updateMembershipPlan(id, payload)),
      addWorkoutPlan: (payload) => runMutation(() => createWorkoutPlan(payload)),
      editWorkoutPlan: (id, payload) => runMutation(() => updateWorkoutPlan(id, payload)),
      removeWorkoutPlan: (id) => runMutation(() => deleteWorkoutPlan(id)),
      assignWorkoutPlan: (id, payload) => runMutation(() => assignWorkoutPlanToMember(id, payload)),
      unassignWorkoutPlan: (id) => runMutation(() => removeWorkoutPlanFromMember(id)),
      sendMessage: (payload) => runMutation(() => sendMessage(payload)),
      markMessagesRead: (ids) => runMutation(() => markMessagesRead({ ids })),
      addMealPlan: (payload) => runMutation(() => createMealPlan(payload)),
      editMealPlan: (id, payload) => runMutation(() => updateMealPlan(id, payload)),
      removeMealPlan: (id) => runMutation(() => deleteMealPlan(id)),
      assignMealPlan: (id, payload) => runMutation(() => assignMealPlanToMember(id, payload)),
      unassignMealPlan: (id) => runMutation(() => removeMealPlanFromMember(id)),
      addAnnouncement: (payload) => runMutation(() => createAnnouncement(payload)),
      editAnnouncement: (id, payload) => runMutation(() => updateAnnouncement(id, payload)),
      removeAnnouncement: (id) => runMutation(() => deleteAnnouncement(id)),
      addExpense: (payload) => runMutation(() => createExpense(payload)),
      editExpense: (id, payload) => runMutation(() => updateExpense(id, payload)),
      addSupplement: (payload) => runMutation(() => createSupplement(payload)),
      editSupplement: (id, payload) => runMutation(() => updateSupplement(id, payload)),
      addSale: (payload) => runMutation(() => createSale(payload)),
      addReturn: (payload) => runMutation(() => createSaleReturn(payload)),
      editMyProfile: (payload) => runMutation(async () => {
        const result = await updateMyProfile(payload);
        syncUser(result.user);
      }),
      updateMyWorkoutProgress: (payload) => runMutation(() => updateMyWorkoutProgress(payload)),
      coachClockIn: () => runMutation(() => clockInCoachAttendance()),
      coachClockOut: (id) => runMutation(() => clockOutCoachAttendance(id)),
      coachStartBreak: (id) => runMutation(() => startCoachBreak(id)),
      coachEndBreak: (id) => runMutation(() => endCoachBreak(id)),
      addSalaryAdvance: (coachId, payload) => createSalaryAdvance(coachId, payload),
      editSalaryAdvance: (coachId, advId, payload) => updateSalaryAdvance(coachId, advId, payload),
      removeSalaryAdvance: (coachId, advId) => deleteSalaryAdvance(coachId, advId),
      getSalaryAdvances: (coachId) => listSalaryAdvances(coachId),
      getMyPayroll: () => getMyPayroll(),
      fetchPayroll: (month) => listPayroll(month),
      runGeneratePayroll: (month) => generatePayroll(month),
      editPayroll: (id, payload) => updatePayrollRecord(id, payload),
      runApprovePayroll: (id) => approvePayrollRecord(id),
      runMarkPayrollPaid: (id, payload) => markPayrollPaid(id, payload),
      runDeletePayroll: (id) => deletePayrollRecord(id)
    }),
    [refresh, runMutation, syncUser]
  );

  const value = React.useMemo(() => ({ data, loading, error, ...actions }), [data, loading, error, actions]);

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const value = React.useContext(DashboardContext);
  if (!value) {
    throw new Error("useDashboard must be used inside DashboardProvider");
  }
  return value;
}
