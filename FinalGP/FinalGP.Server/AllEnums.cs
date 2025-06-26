public enum City
{
    General,
    Alexandria,
    Aswan,
    Asyut,
    Beheira,
    BeniSuef,
    Cairo,
    Dakahlia,
    Damietta,
    Faiyum,
    Gharbia,
    Giza,
    Ismailia,
    KafrElSheikh,
    Luxor,
    Matruh,
    Minya,
    Monufia,
    NewValley,
    NorthSinai,
    PortSaid,
    Qalyubia,
    Qena,
    RedSea,
    Sharqia,
    Sohag,
    SouthSinai,
    Suez
}


public enum Gender
{
    Male = 0,
    Female = 1
}

public enum HomeType
{
    Shared,
    Private
}
public enum HomeApprovalStatus
{
    PendingApproval,
    Approved,
    Rejected,
    Banned
}



public enum ReportStatus
{
    Pending,
    Resolved,
    Rejected
}

public enum BookingStatus
{
    Pending,    // لسه ما حصلش حاجة 
    Paid,
    Confirmed,  // لو اتقبل 
    Expired,    // لو الوقت عدا قبل ما يتقابلوا يقولو expire 
    Cancelled,  // owner cancle
    Renewed     // تجديد الحجز
}


public enum PaymentMethod
{
    CashOnArrival,
    Stripe,
    Wallet
}

public enum TransactionType
{
    Credit,  
    Debit    
}
